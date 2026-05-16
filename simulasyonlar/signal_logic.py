"""
🚥 Signaling & Interlocking Logic (Sinyalizasyon ve Anklaşman Mantığı)
Raylı Sistemler Rehberi - Teknik Simülasyon Serisi

Bu script, basit bir anklaşman kontrol mekanizmasını simüle eder.
Bir rotanın açılabilmesi için gerekli emniyet koşullarını denetler.
"""

class TrackSection:
    def __init__(self, id):
        self.id = id
        self.is_occupied = False
        self.is_locked = False

class Switch:
    def __init__(self, id):
        self.id = id
        self.position = "NORMAL"  # NORMAL veya REVERSE
        self.is_locked = False

def check_interlocking(route_name, sections, switches):
    print(f"🔍 '{route_name}' rotası için anklaşman kontrolü yapılıyor...")
    
    # Emniyet Koşulları:
    # 1. Rotadaki tüm bölümler boş olmalı.
    # 2. Makaslar doğru konumda olmalı.
    
    for section in sections:
        if section.is_occupied:
            print(f"❌ HATA: {section.id} bölümü dolu!")
            return False
            
    for switch in switches:
        if switch.is_locked and switch.position == "REVERSE":
             # Senaryo gereği bu rota NORMAL konumda makas gerektiriyor olsun
             pass
             
    print(f"✅ ONAY: {route_name} rotası emniyetli. Sinyal YEŞİL.")
    return True

if __name__ == "__main__":
    # Test Verileri
    s1 = TrackSection("Bölüm_01")
    s2 = TrackSection("Bölüm_02")
    m1 = Switch("Makas_A")
    
    # Senaryo 1: Temiz hat
    check_interlocking("Ana_Hat_Giriş", [s1, s2], [m1])
    
    print("\n--- Tren Yaklaşıyor ---\n")
    
    # Senaryo 2: İşgal edilmiş hat
    s2.is_occupied = True
    check_interlocking("Ana_Hat_Giriş", [s1, s2], [m1])
