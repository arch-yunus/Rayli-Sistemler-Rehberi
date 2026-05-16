"""
🚄 Train Motion Simulator (Tren Hareket Simülatörü)
Raylı Sistemler Rehberi - Teknik Simülasyon Serisi

Bu script, bir trenin ivmelenme, sabit hız ve frenleme aşamalarını simüle eder.
"""

import math
import time

class Train:
    def __init__(self, name, mass, max_traction_force, max_braking_force):
        self.name = name
        self.mass = mass  # kg
        self.max_traction_force = max_traction_force  # N
        self.max_braking_force = max_braking_force  # N
        self.velocity = 0.0  # m/s
        self.position = 0.0  # m
        self.acceleration = 0.0  # m/s^2

    def update(self, dt, force):
        # F = m * a  => a = F / m
        self.acceleration = force / self.mass
        self.velocity += self.acceleration * dt
        if self.velocity < 0:
            self.velocity = 0
        self.position += self.velocity * dt

def run_simulation():
    # Örnek: Bir metro vagonu (40 ton)
    metro = Train("Ankara Metro", 40000, 50000, 60000)
    
    dt = 1.0  # saniye
    total_time = 60  # saniye
    
    print(f"--- {metro.name} Simülasyonu Başlıyor ---")
    print("Zaman(s) | Hız(km/h) | Mesafe(m) | İvme(m/s2)")
    print("-" * 45)

    for t in range(total_time):
        # Basit senaryo: İlk 20 sn tam çekiş, sonra 20 sn serbest sürüş, sonra fren
        if t < 20:
            force = metro.max_traction_force
        elif t < 40:
            force = -2000  # Hava direnci vb. (basit model)
        else:
            force = -metro.max_braking_force
            
        metro.update(dt, force)
        
        velocity_kmh = metro.velocity * 3.6
        print(f"{t:7d} | {velocity_kmh:9.2f} | {metro.position:10.2f} | {metro.acceleration:10.2f}")
        
    print("-" * 45)
    print("Simülasyon tamamlandı.")

if __name__ == "__main__":
    run_simulation()
