# Parametrik Gazlı Amortisör CAD Motoru (Gas Spring CAD Studio)

Renkli montaj destekli parametrik gazlı amortisör mühendislik hesaplama, 3D WebGL (Three.js) CAD görselleştirme, ISO 10303-21 STEP AP214 montaj ihracatı, ERP MSSQL BOM entegrasyonu ve toplu dizayn otomasyon motoru.

---

## 🚀 Vercel Üzerinde Yayınlama Adımları (Deploy to Vercel)

Bu proje **Vite + React 19 + TypeScript + Tailwind CSS** mimarisindedir ve Vercel üzerinde sıfır yapılandırma ile sorunsuz çalışacak şekilde `vercel.json` dosyası eklenmiştir.

### Yöntem 1: GitHub / GitLab ile Otomatik Yayınlama (Önerilen)

1. **Projeyi GitHub'a Yükleyin:**
   ```bash
   git init
   git add .
   git commit -m "feat: Gas Spring CAD Engine v1.0"
   git branch -M main
   git remote add origin https://github.com/KULLANICI_ADINIZ/gas-spring-cad.git
   git push -u origin main
   ```

2. **Vercel Kontrol Paneline Gidin:**
   - [vercel.com](https://vercel.com) adresine giriş yapın.
   - **"Add New..."** → **"Project"** butonuna tıklayın.
   - GitHub deponuzu seçip **"Import"** deyin.

3. **Derleme Ayarlarını Doğrulayın:**
   - **Framework Preset:** `Vite` *(Vercel otomatik tanır)*
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
   *(Tüm bu ayarlar `vercel.json` içerisinde zaten otomatik tanımlıdır).*

4. **"Deploy"** butonuna basın. Yaklaşık 30-45 saniye içinde uygulamanız `https://proje-adiniz.vercel.app` adresinde canlıya alınır!

---

### Yöntem 2: Vercel CLI ile Doğrudan Terminalden Yayınlama

Terminalinizden projeyi tek komutla doğrudan Vercel'e gönderebilirsiniz:

```bash
# 1. Vercel CLI ile giriş yapın ve dağıtın:
npx vercel

# 2. Üretim (Production) ortamına canlıya almak için:
npx vercel --prod
```

CLI sihirbazı size şu soruları soracaktır:
- `Set up and deploy?` → **Y**
- `Which scope?` → Kendi hesabınızı seçin
- `Link to existing project?` → **N**
- `Project name?` → `gas-spring-cad`
- `In which directory is your code located?` → `./`
- `Want to modify settings?` → **N**

---

## 🛠️ Yerel Geliştirme (Local Development)

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın (Port: 3000)
npm run dev

# Üretim derlemesi oluşturun
npm run build

# Derlemeyi yerelde test edin
npm run preview
```

---

## 📦 Proje Özellikleri

- **Etkileşimli 3D CAD Görünümü (Three.js):** Siyah tüp, krom mil ve anodize mavi mafsallardan oluşan gerçek zamanlı assembly montajı.
- **Dinamik Strok Sıkıştırma Simülatörü:** Milin silindir içine hareketini ve F(x) kuvvet artışını canlı izleme.
- **Montaj Patlatma (Exploded View) & Kesit Görünümü (Cutaway):** İç keçe, kılavuz burç ve yağ havuzu kontrolü.
- **Özelleştirilebilir Uç Bağlantıları:** Gözlü mafsal, bilyalı mafsal, çatal mafsal, dişli mil ve flanş tiplerini tanımlama ve yönetme.
- **Amortisör Tipi ve Hesaplama Parametreleri:** Standart İtme, Çekme, Kilitlenebilir (Bloc-o-Lift), AISI 316 Paslanmaz ve Damper modelleri için K-faktörü, ölü boy ve basınç limitleri ayarı.
- **ERP & MSSQL BOM Transferi:** Kurumsal veritabanlarına (Logo Tiger, Mikro/Netsis, SAP, Dynamics, Canias) ürün ağacı ve T-SQL script transferi.
- **Toplu Dizayn Otomasyonu (Batch CAD):** Matris jeneratörü ile onlarca kombinasyonu tek ekranda hesaplama, toplu .STEP ve .STL ihracatı.
- **Geçerli CAD İhracatı:** SolidWorks, Inventor, Fusion 360, FreeCAD uyumlu ISO 10303-21 STEP AP214 montaj dosyası üretimi.
