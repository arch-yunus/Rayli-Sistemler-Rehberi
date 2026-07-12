"""
🚥 Signaling & Interlocking Logic (Sinyalizasyon ve Anklaşman Mantığı)
Raylı Sistemler Rehberi - Teknik Simülasyon Serisi

Bu script, bir demiryolu istasyon bölgesindeki anklaşman emniyet kurallarını simüle eder.
Gelişmiş Rota Tablosu (Route Table) ve Anklaşman Matrisi kullanılarak rotaların
emniyet koşulları ve kilitleme mekanizmaları denetlenir.
"""

class TrackSection:
    def __init__(self, section_id):
        self.id = section_id
        self.is_occupied = False  # Ray devresi veya aks sayıcı ile doluluk tespiti
        self.is_locked = False    # Rota kilidi (tren geçene kadar kilitli kalır)

class Switch:
    def __init__(self, switch_id):
        self.id = switch_id
        self.position = "NORMAL"  # NORMAL (düz hat) veya REVERSE (sapma)
        self.is_locked = False    # Rota tarafından kilitlendi mi?

class Route:
    def __init__(self, name, start_signal, end_signal, required_sections, required_switches, conflicting_routes):
        self.name = name
        self.start_signal = start_signal
        self.end_signal = end_signal
        self.required_sections = required_sections  # Liste: [TrackSection]
        self.required_switches = required_switches  # Sözlük: {Switch: "NORMAL"|"REVERSE"}
        self.conflicting_routes = conflicting_routes  # Liste: [str] (Çelişen rotaların isimleri)
        self.is_established = False

class InterlockingSystem:
    def __init__(self, sections, switches):
        self.sections = {s.id: s for s in sections}
        self.switches = {sw.id: sw for sw in switches}
        self.routes = {}
        self.active_routes = set()

    def add_route(self, route):
        self.routes[route.name] = route

    def request_route(self, route_name):
        """
        Kullanıcıdan gelen rota talebini değerlendirir (Anklaşman Kuralları).
        """
        print(f"\n[ANKLASMAN] '{route_name}' rotasi talep edildi...")
        
        if route_name not in self.routes:
            print(f"[HATA] '{route_name}' tanimli bir rota degil!")
            return False
            
        route = self.routes[route_name]
        
        # 1. Çelişen rota kontrolü
        for active_route_name in self.active_routes:
            if active_route_name in route.conflicting_routes:
                print(f"[HATA] Celisen '{active_route_name}' rotasi zaten aktif!")
                return False
                
        # 2. Hat bölümlerinin doluluk kontrolü (Track Circuit / Axle Counter)
        for section in route.required_sections:
            if section.is_occupied:
                print(f"[HATA] Rota uzerindeki {section.id} bolumu dolu (isgal altinda)!")
                return False
            if section.is_locked:
                print(f"[HATA] {section.id} bolumu baska bir rota icin kilitli!")
                return False
                
        # 3. Makas durumları ve kilitlenebilirlik kontrolü
        for sw, req_pos in route.required_switches.items():
            if sw.is_locked and sw.position != req_pos:
                print(f"[HATA] {sw.id} makasi baska bir rota icin kilitli ve istenen konumda ({req_pos}) degil!")
                return False

        # --- TÜM EMNİYET KOŞULLARI SAĞLANDI ---
        # 4. Makasların doğru konuma getirilmesi ve kilitlenmesi
        print(f"[MAKASLAR] Makaslar ayarlaniyor ve kilitleniyor:")
        for sw, req_pos in route.required_switches.items():
            if sw.position != req_pos:
                print(f"   -> {sw.id} konumu {sw.position} konumundan {req_pos} konumuna alindi.")
                sw.position = req_pos
            sw.is_locked = True
            print(f"   -> {sw.id} kilitlendi.")
            
        # 5. Hat kesimlerinin kilitlenmesi
        print(f"[KILIT] Hat bolumleri kilitleniyor:")
        for section in route.required_sections:
            section.is_locked = True
            print(f"   -> {section.id} kilitlendi.")
            
        # 6. Rotanın aktif hale getirilmesi ve Sinyalin AÇILMASI (Yeşil)
        route.is_established = True
        self.active_routes.add(route.name)
        
        print(f"[OK] Rota kuruldu. {route.start_signal} sinyali [YESIL]. Rota emniyetli.")
        return True

    def release_route(self, route_name):
        """
        Tren rotayı tamamladıktan sonra kilitleri çözer.
        """
        if route_name not in self.routes or route_name not in self.active_routes:
            print(f"\n[HATA] Cozulecek aktif '{route_name}' rotasi bulunamadi!")
            return
            
        route = self.routes[route_name]
        print(f"\n[ANKLASMAN] '{route_name}' rotasi kilitleri cozuluyor...")
        
        # Makasların kilidini aç
        for sw in route.required_switches.keys():
            sw.is_locked = False
            print(f"   -> {sw.id} kilidi acildi.")
            
        # Hat bölümlerinin kilidini aç
        for section in route.required_sections:
            section.is_locked = False
            print(f"   -> {section.id} kilidi acildi.")
            
        route.is_established = False
        self.active_routes.remove(route_name)
        print(f"[INFO] '{route_name}' rotasi basariyla kapatildi. {route.start_signal} sinyali [KIRMIZI].")

def run_simulation():
    # İstasyon Elemanlarını Oluştur
    # T1: Ana Hat 1, T2: Sapma/İstasyon Yolu, A: Giriş Bölümü, B: Çıkış Bölümü
    sec_in = TrackSection("Giris_Blogu")
    sec_main = TrackSection("Ana_Hat_T1")
    sec_loop = TrackSection("Istasyon_Yolu_T2")
    sec_out = TrackSection("Cikis_Blogu")
    
    sw_a = Switch("Makas_Giris")
    sw_b = Switch("Makas_Cikis")
    
    # Anklaşman Sistemini Başlat
    interlocking = InterlockingSystem(
        sections=[sec_in, sec_main, sec_loop, sec_out],
        switches=[sw_a, sw_b]
    )
    
    # Rotaları Tanımla
    # Rota 1: Girişten Ana Hatta Geçiş (Sw_A NORMAL konumda olmalı)
    route_main = Route(
        name="Ana_Hat_Gecis",
        start_signal="Sinyal_Giris",
        end_signal="Sinyal_Cikis_1",
        required_sections=[sec_in, sec_main, sec_out],
        required_switches={sw_a: "NORMAL", sw_b: "NORMAL"},
        conflicting_routes=["Istasyon_Yolu_Gecis"]
    )
    
    # Rota 2: Girişten İstasyon Yoluna Geçiş (Sw_A REVERSE konumda olmalı)
    route_loop = Route(
        name="Istasyon_Yolu_Gecis",
        start_signal="Sinyal_Giris",
        end_signal="Sinyal_Cikis_2",
        required_sections=[sec_in, sec_loop, sec_out],
        required_switches={sw_a: "REVERSE", sw_b: "REVERSE"},
        conflicting_routes=["Ana_Hat_Gecis"]
    )
    
    interlocking.add_route(route_main)
    interlocking.add_route(route_loop)
    
    print("===========================================================")
    print("[SINYAL] Istasyon Anklasman Test Senaryolari")
    print("===========================================================")
    
    # Senaryo 1: Her şey normal, Ana Hat rotası talep ediliyor
    interlocking.request_route("Ana_Hat_Gecis")
    
    # Senaryo 2: Ana hat aktifken, çelişen istasyon yolu rotası talep ediliyor (Reddedilmeli)
    interlocking.request_route("Istasyon_Yolu_Gecis")
    
    # Rota 1'i serbest bırakalım
    interlocking.release_route("Ana_Hat_Gecis")
    
    # Senaryo 3: İstasyon Yolu işgal altındayken oraya rota talep ediliyor (Reddedilmeli)
    print("\n--- Istasyon yoluna bir tren park ediyor ---")
    sec_loop.is_occupied = True
    
    interlocking.request_route("Istasyon_Yolu_Gecis")
    
    # Rayı temizleyelim ve tekrar deneyelim
    print("\n--- Istasyon yolu bosaltildi ---")
    sec_loop.is_occupied = False
    interlocking.request_route("Istasyon_Yolu_Gecis")
    
    print("===========================================================")
    print("Simulasyon basariyla tamamlandi.")
    print("===========================================================")

if __name__ == "__main__":
    run_simulation()

