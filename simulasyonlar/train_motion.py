"""
🚄 Train Motion Simulator (Tren Hareket Simülatörü)
Raylı Sistemler Rehberi - Teknik Simülasyon Serisi

Bu script, bir trenin ivmelenme, sabit hız, serbest sürüş (coasting) ve frenleme aşamalarını
fizik ve demiryolu mühendisliği standartlarına uygun olarak simüle eder.
Aerodinamik ve mekanik dirençler için Davis Denklemi kullanılmıştır.
"""

import math

class Train:
    def __init__(self, name, mass, max_traction_force, max_braking_force, frontal_area=10.0):
        self.name = name
        self.mass = mass  # kg (Toplam tren kütlesi)
        self.max_traction_force = max_traction_force  # N (Maksimum çekiş gücü)
        self.max_braking_force = max_braking_force  # N (Maksimum fren gücü)
        self.frontal_area = frontal_area  # m^2 (Rüzgar direnci için ön alan)
        
        self.velocity = 0.0  # m/s (Anlık hız)
        self.position = 0.0  # m (Anlık konum)
        self.acceleration = 0.0  # m/s^2 (Anlık ivme)
        
        # Davis Denklemi Katsayıları: R_direnc = A + B*v + C*v^2
        # A: Yuvarlanma direnci (Rulmanlar ve mekanik temas) - Kütleye bağlıdır
        # B: Flanş sürtünmesi ve mekanik kayıplar - Hızla lineer değişir
        # C: Aerodinamik sürüklenme - Hızın karesiyle değişir
        g_acc = 9.81
        self.davis_A = 6.4 * (self.mass / 1000) * 0.001 * g_acc  # N (Yaklaşık mekanik direnç)
        self.davis_B = 0.18 * (self.mass / 1000) * 0.001 * g_acc  # N / (m/s)
        self.davis_C = 0.35 * self.frontal_area  # N / (m/s)^2

    def get_resistance(self, velocity, gradient_per_thousand=0.0, curve_radius_m=0.0):
        """
        Trenin maruz kaldığı toplam direnç kuvvetini hesaplar (N).
        - Davis Direnci (Mekanik + Rüzgar)
        - Eğim Direnci (Yerçekimi bileşeni)
        - Kurp (Eğri) Direnci
        """
        v = max(0.0, velocity)
        
        # 1. Davis Direnci
        r_davis = self.davis_A + (self.davis_B * v) + (self.davis_C * (v ** 2))
        
        # 2. Eğim Direnci: F_eğim = m * g * sin(theta) ~ m * g * (i / 1000)
        # 10‰ (promil) eğim = 0.01 radyan eğim açısı
        g = 9.81
        r_grade = self.mass * g * (gradient_per_thousand / 1000.0)
        
        # 3. Kurp Direnci (Röckl Formülü: R_kurp = 650 / (R - 55) kg/ton cinsinden, N'a çevrilir)
        r_curve = 0.0
        if curve_radius_m > 300.0:
            r_curve_kg_ton = 650.0 / (curve_radius_m - 55.0)
            r_curve = (self.mass / 1000.0) * r_curve_kg_ton * g
        elif curve_radius_m > 0.0:
            # 300 metreden küçük dar kurplar için
            r_curve_kg_ton = 500.0 / (curve_radius_m - 30.0)
            r_curve = (self.mass / 1000.0) * r_curve_kg_ton * g
            
        return r_davis + r_grade + r_curve

    def update(self, dt, requested_force, gradient_per_thousand=0.0, curve_radius_m=0.0):
        """
        Tren dinamiklerini bir zaman adımı (dt) kadar ileri götürür.
        """
        # Toplam direnç kuvveti
        resistance = self.get_resistance(self.velocity, gradient_per_thousand, curve_radius_m)
        
        # Net kuvvet = Uygulanan kuvvet (Çekiş/Fren) - Direnç kuvvetleri
        # requested_force pozitif ise çekiş (traction), negatif ise frenleme (braking)
        applied_force = 0.0
        if requested_force > 0:
            applied_force = min(requested_force, self.max_traction_force)
        elif requested_force < 0:
            applied_force = max(requested_force, -self.max_braking_force)
            
        net_force = applied_force - resistance
        
        # F = m * a  => a = F / m
        self.acceleration = net_force / self.mass
        
        # Hız güncelleme
        self.velocity += self.acceleration * dt
        if self.velocity < 0:
            self.velocity = 0.0
            self.acceleration = 0.0
            
        # Konum güncelleme
        self.position += self.velocity * dt

def run_simulation():
    # Metro treni tanımı: 120 ton ağırlığında, 120 kN çekiş gücü, 150 kN fren gücü
    metro = Train(
        name="Milli Metro Seti (TÜRASAŞ)",
        mass=120000,           # 120 ton
        max_traction_force=120000, # 120 kN
        max_braking_force=150000,   # 150 kN
        frontal_area=11.5      # 11.5 m^2
    )
    
    dt = 1.0  # saniye
    total_time = 80  # saniye
    
    # Hat Profili Parametreleri
    gradient = 5.0      # ‰5 rampa yukarı eğim
    curve_radius = 600.0 # 600 metre yarıçaplı kurp (eğri)
    
    print(f"===========================================================")
    print(f"[TREN] {metro.name} Dinamik Simulasyonu Basliyor")
    print(f"Kutle: {metro.mass/1000:.1f} ton | Maks Cekis: {metro.max_traction_force/1000:.1f} kN")
    print(f"Hat Parametreleri -> Egim: promil {gradient} | Kurp Yaricapi: {curve_radius}m")
    print(f"===========================================================")
    print(f"{'Zaman (sn)':<10} | {'Hiz (km/h)':<10} | {'Mesafe (m)':<11} | {'Ivme (m/s2)':<11} | {'Direnc (kN)':<11}")
    print("-" * 65)

    for t in range(total_time):
        # Gerçekçi sürüş senaryosu:
        # 0-30 sn: Tam güç ivmelenme (Acceleration)
        # 30-55 sn: Serbest sürüş / Süzülme (Coasting - Çekiş sıfır)
        # 55-80 sn: Servis frenlemesi (Braking - 80 kN fren gücü uygulanıyor)
        if t < 30:
            force = metro.max_traction_force
            phase = "Hizlanma"
        elif t < 55:
            force = 0.0
            phase = "Suzulme"
        else:
            force = -80000.0
            phase = "Frenleme"
            
        resistance = metro.get_resistance(metro.velocity, gradient, curve_radius)
        metro.update(dt, force, gradient, curve_radius)
        
        velocity_kmh = metro.velocity * 3.6
        print(f"{t:<10d} | {velocity_kmh:<10.2f} | {metro.position:<11.1f} | {metro.acceleration:<11.3f} | {resistance/1000:<11.2f}")
        
        # Tren tamamen durduğunda fren aşamasındaysak simülasyonu erken bitirebiliriz
        if t >= 55 and metro.velocity == 0.0:
            print("-" * 65)
            print(f"Tren durdu. Simulasyon {t}. saniyede sonlandirildi.")
            break
            
    print("===========================================================")
    print("Simulasyon basariyla tamamlandi.")
    print("===========================================================")

if __name__ == "__main__":
    run_simulation()
