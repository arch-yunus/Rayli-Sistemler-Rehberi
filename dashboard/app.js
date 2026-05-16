// Rail Systems Guide - Interactive Logic

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚄 Raylı Sistemler Rehberi Dashboard Yüklendi!");
    
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            // Subtle sound or effect could be added here
            // console.log(`İncelenen Modül: ${card.querySelector('h2').innerText}`);
        });
    });

    // Dynamic background effect (optional)
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        // document.body.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, #1e293b, #0f172a)`;
    });
});
