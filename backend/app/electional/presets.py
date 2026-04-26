"""Electional search condition presets and labels."""

from stellium.electional import (
    ElectionalSearch,
    all_of,
    any_of,
    not_,
    is_waxing,
    not_voc,
    not_combust,
    not_retrograde,
    not_debilitated,
    sign_not_in,
    in_house,
    no_malefic_aspect,
    no_hard_aspect,
    aspect_applying,
)

CONDITION_MAP = {
    "moon_waxing": is_waxing(),
    "moon_not_voc": not_voc(),
    "moon_not_combust": not_combust("Moon"),
    "moon_not_in_difficult_signs": sign_not_in("Moon", ["Scorpio", "Capricorn"]),
    "mercury_not_rx": not_retrograde("Mercury"),
    "venus_not_rx": not_retrograde("Venus"),
    "jupiter_not_rx": not_retrograde("Jupiter"),
    "mars_not_rx": not_retrograde("Mars"),
    "no_malefic_to_moon": no_malefic_aspect("Moon"),
    "no_hard_to_moon": no_hard_aspect("Moon"),
    "moon_applying_benefics": any_of(
        aspect_applying("Moon", "Jupiter", ["conjunction", "trine", "sextile"]),
        aspect_applying("Moon", "Venus", ["conjunction", "trine", "sextile"]),
    ),
    "jupiter_well_placed": any_of(
        in_house("Jupiter", [1, 4, 7, 10, 11]),
    ),
    "mars_not_debilitated": not_debilitated("Mars"),
}

PRESETS = {
    "general": {
        "label_ru": "Общее благоприятное",
        "desc_ru": "Растущая Луна, не пустая в ходе, Меркурий прямой, Луна не в знаках изгнания",
        "conditions": [
            "moon_waxing",
            "moon_not_voc",
            "mercury_not_rx",
            "moon_not_in_difficult_signs",
        ],
    },
    "business": {
        "label_ru": "Бизнес / запуск",
        "desc_ru": "Растущая Луна, не пустая в ходе, Меркурий прямой, Юпитер в хорошем доме, нет поражения Луны",
        "conditions": [
            "moon_waxing",
            "moon_not_voc",
            "mercury_not_rx",
            "jupiter_well_placed",
            "no_malefic_to_moon",
        ],
    },
    "relationship": {
        "label_ru": "Отношения / брак",
        "desc_ru": "Растущая Луна, не пустая в ходе, Венера прямая, гармония Луны с benefics",
        "conditions": [
            "moon_waxing",
            "moon_not_voc",
            "venus_not_rx",
            "moon_not_in_difficult_signs",
            "moon_applying_benefics",
        ],
    },
    "contracts": {
        "label_ru": "Контракты / общение",
        "desc_ru": "Меркурий прямой, Луна не пустая, растущая Луна, не в трудных знаках",
        "conditions": [
            "moon_waxing",
            "moon_not_voc",
            "mercury_not_rx",
            "moon_not_in_difficult_signs",
        ],
    },
    "competition": {
        "label_ru": "Конкуренция / спорт",
        "desc_ru": "Марс прямой и силён, Луна без напряжённых аспектов, растущая Луна",
        "conditions": [
            "mars_not_rx",
            "mars_not_debilitated",
            "no_hard_to_moon",
            "moon_waxing",
        ],
    },
    "expansion": {
        "label_ru": "Расширение / удача",
        "desc_ru": "Юпитер прямой, Луна в гармонии с benefics, не пустая в ходе",
        "conditions": [
            "moon_waxing",
            "moon_not_voc",
            "jupiter_not_rx",
            "moon_applying_benefics",
        ],
    },
}

CONDITION_LABELS = {
    "moon_waxing": {"label_ru": "Растущая Луна", "desc_ru": "Луна в растущей фазе (от новолуния до полнолуния)"},
    "moon_not_voc": {"label_ru": "Луна не пустая в ходе", "desc_ru": "Луна имеет применяющие аспекты — не VOC"},
    "moon_not_combust": {"label_ru": "Луна не сожжена", "desc_ru": "Луна не вблизи Солнца (>8.5°)"},
    "moon_not_in_difficult_signs": {"label_ru": "Луна не в знаках изгнания", "desc_ru": "Луна не в Скорпионе и Козероге"},
    "mercury_not_rx": {"label_ru": "Меркурий прямой", "desc_ru": "Меркурий не ретрограден — важно для контрактов"},
    "venus_not_rx": {"label_ru": "Венера прямая", "desc_ru": "Венера не ретроградна — важно для отношений"},
    "jupiter_not_rx": {"label_ru": "Юпитер прямой", "desc_ru": "Юпитер не ретрограден — для расширения"},
    "mars_not_rx": {"label_ru": "Марс прямой", "desc_ru": "Марс не ретрограден — для действий"},
    "no_malefic_to_moon": {"label_ru": "Нет поражения Луны", "desc_ru": "Луна без напряжённых аспектов от Марса/Сатурна"},
    "no_hard_to_moon": {"label_ru": "Луна без напряжённых аспектов", "desc_ru": "Нет квадратур и оппозиций к Луне"},
    "moon_applying_benefics": {"label_ru": "Луна к benefics", "desc_ru": "Луна в применяющем аспекте к Юпитеру/Венере"},
    "jupiter_well_placed": {"label_ru": "Юпитер в хорошем доме", "desc_ru": "Юпитер в 1, 4, 7, 10 или 11 доме"},
    "mars_not_debilitated": {"label_ru": "Марс не в изгнании", "desc_ru": "Марс не в Раке/Весах (изгнание/падение)"},
}


def get_preset_conditions(preset: str) -> list[str]:
    if preset in PRESETS:
        return PRESETS[preset]["conditions"]
    return PRESETS["general"]["conditions"]


def build_conditions(condition_keys: list[str]) -> list:
    result = []
    for key in condition_keys:
        if key in CONDITION_MAP:
            result.append(CONDITION_MAP[key])
    return result


def evaluate_conditions(chart, condition_keys: list[str]) -> dict:
    met = []
    missed = []
    for key in condition_keys:
        cond = CONDITION_MAP.get(key)
        if cond is None:
            continue
        try:
            if cond(chart):
                met.append(key)
            else:
                missed.append(key)
        except Exception:
            missed.append(key)
    return {"met": met, "missed": missed}


def generate_description(met: list[str], missed: list[str]) -> str:
    parts = []
    if not missed:
        parts.append("Все условия выполнены.")
    else:
        missed_labels = [CONDITION_LABELS.get(k, k).get("label_ru", k) for k in missed]
        parts.append(f"Не выполнены: {', '.join(missed_labels)}.")
    if met:
        met_labels = [CONDITION_LABELS.get(k, k).get("label_ru", k) for k in met]
        parts.append(f"Выполнены: {', '.join(met_labels)}.")
    return " ".join(parts)