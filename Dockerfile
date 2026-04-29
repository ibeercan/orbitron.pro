FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/


FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    fontconfig \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash app

# Install fonts for Typst PDF generation (Cinzel Decorative, Crimson Pro, Noto Sans Symbols 2)
ARG FONT_DIR=/usr/local/share/fonts/truetype/custom
RUN mkdir -p "${FONT_DIR}/Cinzel_Decorative" "${FONT_DIR}/Crimson_Pro" "${FONT_DIR}/Noto_Sans_Symbols_2" && \
    # Cinzel Decorative: Regular (400), Bold (700), Black (900)
    curl -sL "https://fonts.gstatic.com/s/cinzeldecorative/v19/daaCSScvJGqLYhG8nNt8KPPswUAPnh7U.ttf" \
         -o "${FONT_DIR}/Cinzel_Decorative/CinzelDecorative-Regular.ttf" && \
    curl -sL "https://fonts.gstatic.com/s/cinzeldecorative/v19/daaHSScvJGqLYhG8nNt8KPPswUAPniZQa-lD.ttf" \
         -o "${FONT_DIR}/Cinzel_Decorative/CinzelDecorative-Bold.ttf" && \
    curl -sL "https://fonts.gstatic.com/s/cinzeldecorative/v19/daaHSScvJGqLYhG8nNt8KPPswUAPniZoaelD.ttf" \
         -o "${FONT_DIR}/Cinzel_Decorative/CinzelDecorative-Black.ttf" && \
    # Crimson Pro: Regular (400), SemiBold (600), Bold (700), Italic (400)
    curl -sL "https://fonts.gstatic.com/s/crimsonpro/v28/q5uSsoa5M_tv7IihmnkabAReu49Y_Bo-HVKMBi6Ue5s7.ttf" \
         -o "${FONT_DIR}/Crimson_Pro/CrimsonPro-Regular.ttf" && \
    curl -sL "https://fonts.gstatic.com/s/crimsonpro/v28/q5uUsoa5M_tv7IihmnkabC5XiXCAlXGks1WZKWp8OA.ttf" \
         -o "${FONT_DIR}/Crimson_Pro/CrimsonPro-SemiBold.ttf" && \
    curl -sL "https://fonts.gstatic.com/s/crimsonpro/v28/q5uUsoa5M_tv7IihmnkabC5XiXCAlXGks1WZEGp8OA.ttf" \
         -o "${FONT_DIR}/Crimson_Pro/CrimsonPro-Bold.ttf" && \
    curl -sL "https://fonts.gstatic.com/s/crimsonpro/v28/q5uUsoa5M_tv7IihmnkabC5XiXCAlXGks1WZzm18OA.ttf" \
         -o "${FONT_DIR}/Crimson_Pro/CrimsonPro-Italic.ttf" && \
    # Noto Sans Symbols 2: Regular — astrological symbols
    curl -sL "https://fonts.gstatic.com/s/notosanssymbols2/v25/I_uyMoGduATTei9eI8daxVHDyfisHr71ypM.ttf" \
         -o "${FONT_DIR}/Noto_Sans_Symbols_2/NotoSansSymbols2-Regular.ttf" && \
    fc-cache -f

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn
COPY --from=builder /usr/local/bin/alembic /usr/local/bin/alembic
COPY --from=builder /app/backend/ ./backend/

COPY backend/scripts/entrypoint.sh /app/backend/scripts/entrypoint.sh
RUN chmod +x /app/backend/scripts/entrypoint.sh

RUN chown -R app:app /app

USER app

WORKDIR /app/backend
ENV PYTHONPATH=/app/backend

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/app/backend/scripts/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]