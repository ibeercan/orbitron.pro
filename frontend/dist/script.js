class StarField {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stars = [];
        this.resize();
        this.init();
        
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.init();
    }
    
    init() {
        this.stars = [];
        const count = Math.floor((this.canvas.width * this.canvas.height) / 8000);
        
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.5 + 0.3,
                twinkleSpeed: Math.random() * 0.02 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (const star of this.stars) {
            star.twinklePhase += star.twinkleSpeed;
            const opacity = star.opacity + Math.sin(star.twinklePhase) * 0.2;
            
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(200, 210, 230, ${Math.max(0.1, opacity)})`;
            this.ctx.fill();
            
            if (star.size > 1) {
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(129, 140, 248, ${opacity * 0.2})`;
                this.ctx.fill();
            }
        }
        
        requestAnimationFrame(() => this.draw());
    }
}

class ShootingStars {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stars = [];
        this.lastSpawn = 0;
        this.spawnInterval = 3000 + Math.random() * 5000;
        
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
    }
    
    createStar() {
        this.stars.push({
            x: Math.random() * this.canvas.width * 0.8,
            y: Math.random() * this.canvas.height * 0.3,
            length: Math.random() * 80 + 40,
            speed: Math.random() * 8 + 6,
            angle: Math.PI / 4 + Math.random() * 0.2,
            opacity: 1,
            width: Math.random() * 2 + 1
        });
    }
    
    update() {
        const now = Date.now();
        
        if (now - this.lastSpawn > this.spawnInterval) {
            this.createStar();
            this.lastSpawn = now;
            this.spawnInterval = 3000 + Math.random() * 5000;
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = this.stars.length - 1; i >= 0; i--) {
            const star = this.stars[i];
            
            star.x += Math.cos(star.angle) * star.speed;
            star.y += Math.sin(star.angle) * star.speed;
            star.opacity -= 0.015;
            
            if (star.opacity <= 0 || star.x > this.canvas.width || star.y > this.canvas.height) {
                this.stars.splice(i, 1);
                continue;
            }
            
            const gradient = this.ctx.createLinearGradient(
                star.x, star.y,
                star.x - Math.cos(star.angle) * star.length,
                star.y - Math.sin(star.angle) * star.length
            );
            gradient.addColorStop(0, `rgba(129, 140, 248, ${star.opacity})`);
            gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
            
            this.ctx.beginPath();
            this.ctx.moveTo(star.x, star.y);
            this.ctx.lineTo(
                star.x - Math.cos(star.angle) * star.length,
                star.y - Math.sin(star.angle) * star.length
            );
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = star.width;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.width, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            this.ctx.fill();
        }
        
        requestAnimationFrame(() => this.update());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const starfieldCanvas = document.getElementById('starfield');
    const shootingCanvas = document.getElementById('shooting-stars');
    
    const starfield = new StarField(starfieldCanvas);
    starfield.draw();
    
    const shooting = new ShootingStars(shootingCanvas);
    shooting.update();
});
