# Katkıda Bulunma Rehberi (Contributing Guide)

Öncelikle bu projeye katkıda bulunmak istediğiniz için teşekkür ederiz! Raylı sistemler gibi kritik bir alanda bilgi paylaşımı çok değerlidir.

## Nasıl Katkı Sağlayabilirsiniz?

### 1. İçerik Ekleme (Müfredat ve Dokümantasyon)
Eğer akademik bir konuyu detaylandırmak isterseniz:
- İlgili `mufradat/` klasörü altındaki dosyaları güncelleyin.
- Kaynak gösterdiğinizden ve teknik terimleri [GLOSSARY.md](GLOSSARY.md) dosyasına eklediğinizden emin olun.

### 2. Kod ve Simülasyon Geliştirme
- `simulasyonlar/` klasörü altındaki Python scriptlerine yeni özellikler ekleyebilirsiniz.
- Yeni bir simülasyon aracı eklemek isterseniz, lütfen temiz kod prensiplerine uyun.

### 3. Hata Bildirimi (Bug Report)
- Yazım hataları veya teknik yanlışlıklar için bir **Issue** açabilirsiniz.

## Pull Request Süreci

1. Projeyi **fork** edin.
2. Yeni bir branch açın (`git checkout -b feature/YeniOzellik`).
3. Değişikliklerinizi yapın ve **commit** leyin (`git commit -m 'Açıklayıcı bir mesaj'`).
4. Branch'inizi push edin (`git push origin feature/YeniOzellik`).
5. Bir **Pull Request** açarak değişikliklerinizi gönderin.

## Teknik Standartlar
- Dokümanlarda akademik bir dil kullanın.
- Terimlerin İngilizce karşılıklarını parantez içinde belirtin.
- Simülasyon kodlarında docstring kullanmaya özen gösterin.

Teşekkürler! 🚆
