import { Component, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuestionGeneratorService, GeneratedQuestion, QuestionRequest } from './services/question-generator.service';

// Declare html2canvas globally since we are loading it via CDN
declare var html2canvas: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styles: []
})
export class AppComponent {
  private questionService = inject(QuestionGeneratorService);

  // Form State Signals
  grade = signal<string>('8. Sınıf');
  subject = signal<string>('Matematik');
  topic = signal<string>('');
  difficulty = signal<string>('Orta');
  qType = signal<string>('Çoktan Seçmeli');

  // App State Signals
  isLoading = signal<boolean>(false);
  isDownloading = signal<boolean>(false);
  generatedQuestions = signal<GeneratedQuestion[] | null>(null);
  errorMessage = signal<string>('');

  // Autocomplete State
  filteredTopics = signal<string[]>([]);
  showSuggestions = signal<boolean>(false);

  // Options for dropdowns
  grades = ['4. Sınıf', '5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf', '9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf', 'Mezun'];
  subjects = ['Matematik', 'Türkçe', 'Fen Bilimleri', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'İngilizce'];
  difficulties = ['Kolay', 'Orta', 'Zor', 'Çok Zor', 'Karışık'];
  types = ['Çoktan Seçmeli', 'Klasik', 'Boşluk Doldurma', 'Doğru/Yanlış'];

  // REAL Curriculum Database (Grade -> Subject -> Topics)
  topicDatabase: Record<string, Record<string, string[]>> = {
    '4. Sınıf': {
      'Matematik': ['Doğal Sayılar', 'Toplama İşlemi', 'Çıkarma İşlemi', 'Çarpma İşlemi', 'Bölme İşlemi', 'Kesirler', 'Zaman Ölçme', 'Veri Toplama ve Değerlendirme', 'Geometrik Cisimler ve Şekiller', 'Uzunluk Ölçme', 'Çevre Ölçme', 'Alan Ölçme', 'Tartma', 'Sıvı Ölçme'],
      'Türkçe': ['Okuma Kültürü', 'Milli Mücadele ve Atatürk', 'Erdemler', 'Bilim ve Teknoloji', 'Sanat', 'Birey ve Toplum', 'Sağlık ve Spor', 'Doğa ve Evren'],
      'Fen Bilimleri': ['Yer Kabuğu ve Dünyamızın Hareketleri', 'Besinlerimiz', 'Kuvvetin Etkileri', 'Maddenin Özellikleri', 'Aydınlatma ve Ses Teknolojileri', 'İnsan ve Çevre', 'Basit Elektrik Devreleri'],
      'İngilizce': ['Classroom Rules', 'Nationality', 'Cartoon Characters', 'Free Time', 'My Day', 'Fun with Science', 'Jobs', 'My Clothes', 'My Friends', 'Food and Drinks']
    },
    '5. Sınıf': {
      'Matematik': ['Doğal Sayılar', 'Doğal Sayılarla İşlemler', 'Kesirler', 'Kesirlerle İşlemler', 'Ondalık Gösterim', 'Yüzdeler', 'Temel Geometrik Kavramlar ve Çizimler', 'Üçgenler ve Dörtgenler', 'Veri Toplama ve Değerlendirme', 'Uzunluk ve Zaman Ölçme', 'Alan Ölçme', 'Geometrik Cisimler'],
      'Türkçe': ['Sözcükte Anlam', 'Cümlede Anlam', 'Paragrafta Anlam', 'Ses Bilgisi', 'Yazım Kuralları', 'Noktalama İşaretleri', 'Metin Türleri'],
      'Fen Bilimleri': ['Güneş, Dünya ve Ay', 'Canlılar Dünyası', 'Kuvvetin Ölçülmesi ve Sürtünme', 'Madde ve Değişim', 'Işığın Yayılması', 'İnsan ve Çevre', 'Elektrik Devre Elemanları'],
      'İngilizce': ['Hello', 'My Town', 'Games and Hobbies', 'My Daily Routine', 'Health', 'Movies', 'Party Time', 'Fitness', 'The Animal Shelter', 'Festivals']
    },
    '6. Sınıf': {
      'Matematik': ['Doğal Sayılarla İşlemler', 'Çarpanlar ve Katlar', 'Kümeler', 'Tam Sayılar', 'Kesirlerle İşlemler', 'Ondalık Gösterim', 'Oran', 'Cebirsel İfadeler', 'Veri Toplama ve Değerlendirme', 'Veri Analizi', 'Açılar', 'Alan Ölçme', 'Çember', 'Geometrik Cisimler', 'Sıvı Ölçme'],
      'Türkçe': ['Sözcükte Anlam', 'Cümlede Anlam', 'Paragraf', 'İsimler', 'Sıfatlar', 'Zamirler', 'Edat, Bağlaç, Ünlem', 'İsim ve Sıfat Tamlamaları'],
      'Fen Bilimleri': ['Güneş Sistemi ve Tutulmalar', 'Vücudumuzdaki Sistemler', 'Kuvvet ve Hareket', 'Madde ve Isı', 'Ses ve Özellikleri', 'Vücudumuzdaki Sistemler ve Sağlığı', 'Elektriğin İletimi'],
      'İngilizce': ['Life', 'Yummy Breakfast', 'Downtown', 'Weather and Emotions', 'At the Fair', 'Vacation', 'Occupations', 'Detectives at Work', 'Saving the Planet', 'Democracy']
    },
    '7. Sınıf': {
      'Matematik': ['Tam Sayılarla İşlemler', 'Rasyonel Sayılar', 'Rasyonel Sayılarla İşlemler', 'Cebirsel İfadeler', 'Eşitlik ve Denklem', 'Oran ve Orantı', 'Yüzdeler', 'Doğrular ve Açılar', 'Çokgenler', 'Çember ve Daire', 'Veri Analizi', 'Cisimlerin Görünümleri'],
      'Türkçe': ['Fiiller (Kip ve Kişi)', 'Ek Fiil', 'Zarflar', 'Anlatım Bozuklukları', 'Yazım ve Noktalama', 'Metin Türleri', 'Söz Sanatları'],
      'Fen Bilimleri': ['Güneş Sistemi ve Ötesi', 'Hücre ve Bölünmeler', 'Kuvvet ve Enerji', 'Saf Madde ve Karışımlar', 'Işığın Madde ile Etkileşimi', 'Canlılarda Üreme, Büyüme ve Gelişme', 'Elektrik Devreleri'],
      'İngilizce': ['Appearance and Personality', 'Sports', 'Biographies', 'Wild Animals', 'Television', 'Celebrations', 'Dreams', 'Public Buildings', 'Environment', 'Planets']
    },
    '8. Sınıf': {
      'Matematik': ['Çarpanlar ve Katlar', 'Üslü İfadeler', 'Kareköklü İfadeler', 'Veri Analizi', 'Basit Olayların Olma Olasılığı', 'Cebirsel İfadeler ve Özdeşlikler', 'Doğrusal Denklemler', 'Eşitsizlikler', 'Üçgenler', 'Eşlik ve Benzerlik', 'Dönüşüm Geometrisi', 'Geometrik Cisimler'],
      'Türkçe': ['Fiilimsiler', 'Cümlenin Ögeleri', 'Fiilde Çatı', 'Cümle Türleri', 'Yazım ve Noktalama', 'Anlatım Bozuklukları', 'Metin Türleri', 'Söz Sanatları'],
      'Fen Bilimleri': ['Mevsimler ve İklim', 'DNA ve Genetik Kod', 'Basınç', 'Madde ve Endüstri', 'Basit Makineler', 'Enerji Dönüşümleri ve Çevre Bilimi', 'Elektrik Yükleri ve Elektrik Enerjisi'],
      'Tarih': ['Bir Kahraman Doğuyor', 'Milli Uyanış', 'Ya İstiklal Ya Ölüm', 'Atatürkçülük ve Çağdaşlaşan Türkiye', 'Demokratikleşme Çabaları', 'Atatürk Dönemi Dış Politika', 'Atatürk\'ün Ölümü ve Sonrası'],
      'İngilizce': ['Friendship', 'Teen Life', 'In The Kitchen', 'On The Phone', 'The Internet', 'Adventures', 'Tourism', 'Chores', 'Science', 'Natural Forces']
    },
    '9. Sınıf': {
      'Matematik': ['Mantık', 'Kümeler', 'Denklem ve Eşitsizlikler', 'Üslü ve Köklü İfadeler', 'Oran - Orantı', 'Problemler', 'Üçgenler', 'Veri'],
      'Türkçe': ['Giriş (Edebiyat/İletişim)', 'Hikaye', 'Şiir', 'Masal / Fabl', 'Roman', 'Tiyatro', 'Biyografi / Otobiyografi', 'Mektup / E-posta', 'Günlük / Blog'],
      'Fizik': ['Fizik Bilimine Giriş', 'Madde ve Özellikleri', 'Hareket ve Kuvvet', 'Enerji', 'Isı ve Sıcaklık', 'Elektrostatik'],
      'Kimya': ['Kimya Bilimi', 'Atom ve Periyodik Sistem', 'Kimyasal Türler Arası Etkileşimler', 'Maddenin Halleri', 'Doğa ve Kimya'],
      'Biyoloji': ['Yaşam Bilimi Biyoloji', 'Hücre', 'Canlıların Dünyası (Sınıflandırma)'],
      'Tarih': ['Tarih ve Zaman', 'İnsanlığın İlk Dönemleri', 'Orta Çağ\'da Dünya', 'İlk ve Orta Çağlarda Türk Dünyası', 'İslam Medeniyetinin Doğuşu', 'Türklerin İslamiyet\'i Kabulü'],
      'Coğrafya': ['Doğa ve İnsan', 'Dünya\'nın Şekli ve Hareketleri', 'Harita Bilgisi', 'Atmosfer ve İklim', 'Türkiye\'de İklim', 'Yerin Şekillenmesi', 'İnsan ve Çevre'],
      'İngilizce': ['Studying Abroad', 'My Environment', 'Movies', 'Human in Nature', 'Inspirational People', 'Bridging Cultures', 'World Heritage', 'Emergency and Health', 'Invitations and Celebrations', 'Television and Social Media']
    },
    '10. Sınıf': {
      'Matematik': ['Sayma ve Olasılık', 'Fonksiyonlar', 'Polinomlar', 'İkinci Dereceden Denklemler', 'Dörtgenler ve Çokgenler', 'Katı Cisimler'],
      'Türkçe': ['Giriş (Edebiyat Tarihi)', 'Hikaye', 'Şiir', 'Destan / Efsane', 'Roman', 'Tiyatro', 'Anı (Hatıra)', 'Haber Metni', 'Gezi Yazısı'],
      'Fizik': ['Elektrik ve Manyetizma', 'Basınç ve Kaldırma Kuvveti', 'Dalgalar', 'Optik'],
      'Kimya': ['Kimyanın Temel Kanunları ve Mol', 'Kimyasal Hesaplamalar', 'Karışımlar', 'Asitler, Bazlar ve Tuzlar', 'Kimya Her Yerde'],
      'Biyoloji': ['Hücre Bölünmeleri', 'Kalıtımın Genel İlkeleri', 'Ekosistem Ekolojisi ve Güncel Çevre Sorunları'],
      'Tarih': ['Yerleşme ve Devletleşme Sürecinde Selçuklu', 'Beylikten Devlete Osmanlı', 'Devletleşme Sürecinde Savaşçılar ve Askerler', 'Dünya Gücü Osmanlı', 'Sultan ve Osmanlı Merkez Teşkilatı'],
      'Coğrafya': ['Yerin Yapısı ve Oluşum Süreci', 'Kayaçlar ve Yer Şekilleri', 'Su Kaynakları', 'Topraklar', 'Bitkiler', 'Nüfus', 'Göç', 'Ekonomik Faaliyetler', 'Uluslararası Ulaşım Hatları', 'Afetler'],
      'İngilizce': ['School Life', 'Plans', 'Legendary Figures', 'Traditions', 'Travel', 'Helpful Tips', 'Food and Festivals', 'Digital Era', 'Modern Heroes', 'Shopping']
    },
    '11. Sınıf': {
      'Matematik': ['Trigonometri', 'Analitik Geometri', 'Fonksiyonlarda Uygulamalar', 'Denklem ve Eşitsizlik Sistemleri', 'Çember ve Daire', 'Uzay Geometri', 'Olasılık'],
      'Türkçe': ['Giriş (Edebiyat ve Toplum)', 'Hikaye (Cumhuriyet Dönemi)', 'Şiir (Tanzimat\'tan Cumhuriyet\'e)', 'Makale', 'Sohbet / Fıkra', 'Roman (Cumhuriyet Dönemi)', 'Tiyatro', 'Eleştiri', 'Mülakat / Röportaj'],
      'Fizik': ['Kuvvet ve Hareket', 'İş, Güç, Enerji', 'İtme ve Momentum', 'Tork ve Denge', 'Elektrik ve Manyetizma'],
      'Kimya': ['Modern Atom Teorisi', 'Gazlar', 'Sıvı Çözeltiler ve Çözünürlük', 'Kimyasal Tepkimelerde Enerji', 'Kimyasal Tepkimelerde Hız', 'Kimyasal Tepkimelerde Denge'],
      'Biyoloji': ['İnsan Fizyolojisi (Tüm Sistemler)', 'Komünite ve Popülasyon Ekolojisi'],
      'Tarih': ['Değişen Dünya Dengeleri Karşısında Osmanlı (1595-1774)', 'Değişim Çağında Avrupa ve Osmanlı', 'Uluslararası İlişkilerde Denge Stratejisi (1774-1914)', 'Devrimler Çağında Değişen Devlet-Toplum İlişkileri', 'Sermaye ve Emek'],
      'Coğrafya': ['Biyoçeşitlilik', 'Ekosistemlerin İşleyişi', 'Nüfus Politikaları', 'Şehirlerin Fonksiyonları', 'Türkiye\'de Arazi Kullanımı', 'Türkiye Ekonomisi', 'Kültür Bölgeleri', 'Küresel Ticaret'],
      'İngilizce': ['Future Jobs', 'Hobbies and Skills', 'Hard Times', 'Back to the Past', 'Open Your Heart', 'Education', 'Facts about Turkey', 'Sports', 'My Friends', 'Values and Norms']
    },
    '12. Sınıf': {
      'Matematik': ['Üstel ve Logaritmik Fonksiyonlar', 'Diziler', 'Trigonometri', 'Limit ve Süreklilik', 'Türev', 'İntegral', 'Analitik Geometri (Çember)'],
      'Türkçe': ['Giriş (Felsefe, Psikoloji, Sosyoloji)', 'Hikaye (1980 Sonrası)', 'Şiir (Cumhuriyet Dönemi)', 'Roman (1980 Sonrası)', 'Tiyatro (1950 Sonrası)', 'Deneme', 'Söylev (Nutuk)'],
      'Fizik': ['Çembersel Hareket', 'Basit Harmonik Hareket', 'Dalga Mekaniği', 'Atom Fiziğine Giriş ve Radyoaktivite', 'Modern Fizik'],
      'Kimya': ['Kimya ve Elektrik', 'Karbon Kimyasına Giriş', 'Organik Bileşikler', 'Enerji Kaynakları ve Bilimsel Gelişmeler'],
      'Biyoloji': ['Genden Proteine', 'Canlılarda Enerji Dönüşümleri', 'Bitki Biyolojisi', 'Canlılar ve Çevre'],
      'Tarih': ['20. Yüzyıl Başlarında Dünya', 'İkinci Dünya Savaşı', 'Soğuk Savaş Dönemi', 'Yumuşama Dönemi ve Sonrası', 'Küreselleşen Dünya', '21. Yüzyılın Eşiğinde Türkiye ve Dünya'],
      'Coğrafya': ['Ekstrem Doğa Olayları', 'Geleceğin Dünyası', 'Küreselleşme ve Turizm', 'Uluslararası Örgütler', 'Çevre Sorunları ve Sürdürülebilirlik', 'Ülkeler ve Bölgeler'],
      'İngilizce': ['Music', 'Friendship', 'Human Rights', 'Coming Soon', 'Psychology', 'Favors', 'News Stories', 'Alternative Energy', 'Technology', 'Manners']
    },
    'Mezun': {
      'Matematik': ['Temel Kavramlar', 'Sayı Basamakları', 'Bölme - Bölünebilme', 'EBOB - EKOK', 'Rasyonel Sayılar', 'Basit Eşitsizlikler', 'Mutlak Değer', 'Üslü Sayılar', 'Köklü Sayılar', 'Çarpanlara Ayırma', 'Oran Orantı', 'Problemler', 'Kümeler', 'Fonksiyonlar', 'Polinomlar', 'İkinci Dereceden Denklemler', 'Karmaşık Sayılar', 'Parabol', 'Permütasyon Kombinasyon Olasılık', 'Trigonometri', 'Logaritma', 'Diziler', 'Limit', 'Türev', 'İntegral'],
      'Türkçe': ['Sözcükte Anlam', 'Cümlede Anlam', 'Paragrafta Anlam', 'Ses Bilgisi', 'Yazım Kuralları', 'Noktalama İşaretleri', 'Sözcük Türleri', 'Fiiller', 'Cümlenin Ögeleri', 'Cümle Türleri', 'Anlatım Bozukluğu'],
      'Fizik': ['Fizik Bilimine Giriş', 'Madde ve Özellikleri', 'Hareket ve Kuvvet', 'İş, Güç, Enerji', 'Isı ve Sıcaklık', 'Elektrostatik', 'Elektrik ve Manyetizma', 'Basınç ve Kaldırma Kuvveti', 'Dalgalar', 'Optik', 'Çembersel Hareket', 'Basit Harmonik Hareket', 'Modern Fizik'],
      'Kimya': ['Kimya Bilimi', 'Atom ve Periyodik Sistem', 'Kimyasal Türler Arası Etkileşimler', 'Maddenin Halleri', 'Kimyanın Temel Kanunları', 'Mol Kavramı', 'Karışımlar', 'Asitler, Bazlar, Tuzlar', 'Modern Atom Teorisi', 'Gazlar', 'Sıvı Çözeltiler', 'Kimyasal Tepkimelerde Enerji', 'Hız', 'Denge', 'Kimya ve Elektrik', 'Organik Kimya'],
      'Biyoloji': ['Yaşam Bilimi Biyoloji', 'Hücre', 'Canlıların Sınıflandırılması', 'Hücre Bölünmeleri', 'Kalıtım', 'Ekosistem Ekolojisi', 'İnsan Fizyolojisi', 'Genden Proteine', 'Canlılarda Enerji Dönüşümleri', 'Bitki Biyolojisi'],
      'Tarih': ['Tarih Bilimine Giriş', 'İlk Çağ Uygarlıkları', 'İslamiyet Öncesi Türk Tarihi', 'İslam Tarihi', 'Türk-İslam Tarihi', 'Osmanlı Tarihi (Tüm Dönemler)', 'Kurtuluş Savaşı Hazırlık', 'Kurtuluş Savaşı Cepheler', 'Atatürk İlke ve İnkılapları', 'Çağdaş Türk ve Dünya Tarihi'],
      'Coğrafya': ['Doğa ve İnsan', 'Dünya\'nın Şekli ve Hareketleri', 'Harita Bilgisi', 'İklim Bilgisi', 'Yer\'in Şekillenmesi', 'Nüfus ve Yerleşme', 'Ekonomik Faaliyetler', 'Türkiye Coğrafyası', 'Bölgeler ve Ülkeler', 'Çevre ve Toplum'],
      'İngilizce': ['Vocabulary', 'Grammar', 'Reading Comprehension', 'Translation', 'Dialogue Completion', 'Cloze Test', 'Sentence Completion']
    }
  };

  constructor() {
    // Auto-render Math (MathJax) when questions are updated
    effect(() => {
      const questions = this.generatedQuestions();
      if (questions && questions.length > 0) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          const mathJax = (window as any).MathJax;
          if (mathJax && mathJax.typesetPromise) {
            mathJax.typesetPromise().catch((err: any) => console.error('MathJax render error:', err));
          }
        }, 100);
      }
    });
  }

  // Handle Topic Input for Autocomplete
  onTopicInput() {
    const currentGrade = this.grade();
    const currentSubject = this.subject();
    const currentInput = this.topic().trim().toLowerCase();
    
    // Safety check: if grade doesn't exist in DB, return empty
    if (!this.topicDatabase[currentGrade]) {
        this.filteredTopics.set([]);
        this.showSuggestions.set(false);
        return;
    }

    // Get list of topics for current grade AND subject
    // If subject doesn't exist for that grade (e.g. Physics in 4th grade), returns empty array
    const validTopics = this.topicDatabase[currentGrade][currentSubject] || [];

    if (currentInput.length >= 2) {
      const matches = validTopics.filter(t => 
        t.toLowerCase().includes(currentInput)
      );
      this.filteredTopics.set(matches);
      this.showSuggestions.set(true);
    } else {
      this.showSuggestions.set(false);
    }
  }

  selectTopic(selected: string) {
    this.topic.set(selected);
    this.showSuggestions.set(false);
  }

  onTopicBlur() {
    // Delay hiding to allow click event on dropdown item to register
    setTimeout(() => {
      this.showSuggestions.set(false);
    }, 200);
  }

  // Reset topic when subject changes to avoid invalid topics
  onSubjectChange(newSubject: string) {
    this.subject.set(newSubject);
    this.topic.set('');
    this.filteredTopics.set([]);
    this.showSuggestions.set(false);
  }

  // Reset topic when grade changes to avoid mismatch (e.g. 8th grade topic in 12th grade)
  onGradeChange(newGrade: string) {
    this.grade.set(newGrade);
    this.topic.set('');
    this.filteredTopics.set([]);
    this.showSuggestions.set(false);
  }

  async generate() {
    if (!this.topic()) {
      this.errorMessage.set('Lütfen bir konu başlığı giriniz.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.generatedQuestions.set(null);

    const request: QuestionRequest = {
      grade: this.grade(),
      subject: this.subject(),
      topic: this.topic(),
      difficulty: this.difficulty(),
      qType: this.qType()
    };

    try {
      const questions = await this.questionService.generateQuestions(request);
      this.generatedQuestions.set(questions);
    } catch (error) {
      console.error(error);
      this.errorMessage.set('Sorular oluşturulurken bir hata meydana geldi. Lütfen tekrar deneyin.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadMore() {
    if (!this.topic()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const request: QuestionRequest = {
      grade: this.grade(),
      subject: this.subject(),
      topic: this.topic(),
      difficulty: this.difficulty(),
      qType: this.qType()
    };

    try {
      const newQuestions = await this.questionService.generateQuestions(request);
      // Append new questions to the existing list
      this.generatedQuestions.update(current => [...(current || []), ...newQuestions]);
    } catch (error) {
      console.error(error);
      this.errorMessage.set('Ek sorular oluşturulurken bir hata meydana geldi.');
    } finally {
      this.isLoading.set(false);
    }
  }

  reset() {
    this.generatedQuestions.set(null);
    this.topic.set('');
  }

  async downloadAsJpg() {
    const element = document.getElementById('questions-container');
    if (!element) return;

    this.isDownloading.set(true);

    // Capture dimensions of all MathJax elements in the REAL DOM
    // This ensures we have the correct layout sizes before html2canvas clones the document
    const mathJaxElements = Array.from(element.querySelectorAll('mjx-container'));
    const dimensions = mathJaxElements.map(el => {
      const rect = el.getBoundingClientRect();
      const svg = el.querySelector('svg');
      return {
        width: rect.width,
        height: rect.height,
        verticalAlign: svg ? (window.getComputedStyle(svg).verticalAlign) : '0'
      };
    });

    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true, 
        backgroundColor: '#ffffff', // Ensure white background
        logging: false,
        onclone: (clonedDoc: Document) => {
          const clonedContainers = Array.from(clonedDoc.querySelectorAll('mjx-container'));
          
          clonedContainers.forEach((container: any, index) => {
            const dim = dimensions[index];
            if (!dim) return;

            const svg = container.querySelector('svg');
            if (!svg) return;

            // Set explicit sizes on the SVG to ensure it renders correctly in serialization
            svg.setAttribute('width', `${dim.width}px`);
            svg.setAttribute('height', `${dim.height}px`);
            
            // Serialize SVG to XML string
            const xml = new XMLSerializer().serializeToString(svg);
            
            // Encode to Base64 (safe for UTF-8)
            const encoded = btoa(unescape(encodeURIComponent(xml)));
            const imgSrc = `data:image/svg+xml;base64,${encoded}`;
            
            // Create replacement Image
            const img = clonedDoc.createElement('img');
            img.src = imgSrc;
            img.style.width = `${dim.width}px`;
            img.style.height = `${dim.height}px`;
            img.style.verticalAlign = dim.verticalAlign;
            img.style.display = 'inline-block'; 
            
            // Replace content of mjx-container with the Image
            // We keep the container because it might have margins
            container.innerHTML = '';
            container.appendChild(img);
            
            // Ensure container has dimensions
            container.style.width = `${dim.width}px`;
            container.style.height = `${dim.height}px`;
            container.style.display = 'inline-block';
          });
        }
      });

      const link = document.createElement('a');
      link.download = `inekle-sorular-${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      console.error('Download failed', err);
      this.errorMessage.set('Görüntü indirilirken bir hata oluştu.');
    } finally {
      this.isDownloading.set(false);
    }
  }
}