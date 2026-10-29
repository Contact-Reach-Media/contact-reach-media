import React from 'react';
import { Search, ShoppingCart, CreditCard, ShieldCheck, Truck, ChevronRight } from 'lucide-react';
import { Language, translations } from '../translations.ts';

interface HowToBuySectionProps {
  currentLang: Language;
  onStartShopping: () => void;
}

interface StepItem {
  step: string;
  icon: React.ElementType;
  title: Record<Language, string>;
  desc: Record<Language, string>;
}

export const HowToBuySection: React.FC<HowToBuySectionProps> = ({ currentLang, onStartShopping }) => {
  const t = translations[currentLang] || translations.en;

  const headerTitles: Record<Language, { badge: string; heading: string; sub: string }> = {
    en: {
      badge: 'Simple 5-Step Process',
      heading: 'How to Shop on ContactReach Market',
      sub: 'Fast, transparent, and completely secure shopping with Rwanda’s leading mobile money providers.'
    },
    fr: {
      badge: 'Processus simple en 5 étapes',
      heading: 'Comment acheter sur ContactReach Market',
      sub: 'Achats rapides, transparents et sécurisés avec les principaux fournisseurs de paiement mobile au Rwanda.'
    },
    rw: {
      badge: 'Intambwe 5 Zoroshye',
      heading: 'Uburyo bwo Kugura kuri ContactReach Market',
      sub: 'Kugura kuri twe ni byihuse, byoroshye kandi bitekanye. Kurikiza izi ntambwe zoroshye ugure ibyo wifuza.'
    },
    sw: {
      badge: 'Hatua 5 Rahisi',
      heading: 'Jinsi ya Kununua kwenye ContactReach Market',
      sub: 'Ununuzi wa haraka, wazi na salama kabisa kwa kutumia huduma za fedha za rununu za Rwanda.'
    },
    es: {
      badge: 'Proceso sencillo de 5 pasos',
      heading: 'Cómo comprar en ContactReach Market',
      sub: 'Compras rápidas, transparentes y totalmente seguras con los proveedores líderes de dinero móvil en Ruanda.'
    },
    pt: {
      badge: 'Processo simples em 5 passos',
      heading: 'Como comprar no ContactReach Market',
      sub: 'Compras rápidas, transparentes e totalmente seguras com dinheiro móvel no Ruanda.'
    },
    ar: {
      badge: 'عملية بسيطة من 5 خطوات',
      heading: 'كيفية الشراء من كونتاكت ريتش ماركت',
      sub: 'تسوق سريع وشفاف وآمن تماماً عبر خدمات الدفع بالهاتف المحمول الرائدة في رواندا.'
    },
    zh: {
      badge: '简易5步流程',
      heading: '如何在 ContactReach Market 购物',
      sub: '快捷、透明且高度安全的购物体验，支持卢旺达领先的移动支付方式。'
    },
    de: {
      badge: 'Einfacher 5-Schritte-Prozess',
      heading: 'So kaufen Sie bei ContactReach Market ein',
      sub: 'Schnelles, transparentes und absolut sicheres Einkaufen mit Ruandas führenden Mobile-Money-Anbietern.'
    },
    hi: {
      badge: 'सरल 5-चरणीय प्रक्रिया',
      heading: 'ContactReach Market पर खरीदारी कैसे करें',
      sub: 'रवांडा के प्रमुख मोबाइल मनी प्रदाताओं के साथ तेज़, पारदर्शी और पूरी तरह से सुरक्षित खरीदारी।'
    }
  };

  const steps: StepItem[] = [
    {
      step: '01',
      icon: Search,
      title: {
        en: 'Discover Products',
        fr: 'Découvrir les produits',
        rw: 'Shakisha Ibicuruzwa',
        sw: 'Gundua Bidhaa',
        es: 'Descubrir productos',
        pt: 'Descobrir produtos',
        ar: 'استكشف المنتجات',
        zh: '浏览精选商品',
        de: 'Produkte entdecken',
        hi: 'उत्पाद खोजें'
      },
      desc: {
        en: 'Browse our diverse categories or use the search bar to find genuine cosmetics, smartphones, televisions, and fashion items at unbeatable prices.',
        fr: 'Parcourez nos catégories ou utilisez la recherche pour trouver cosmétiques, smartphones, TV et mode à prix imbattables.',
        rw: 'Reba ibyiciro byinshi by\'ibicuruzwa kandi ukoreshe akabuto ko gushakisha kugira ngo ubone ibyo ushaka byihuse.',
        sw: 'Vinjari kategoria au tumia utafutaji kupata vipodozi, simu, televisheni na mitindo kwa bei nafuu.',
        es: 'Explora nuestras categorías o usa el buscador para hallar cosméticos, teléfonos, televisores y moda.',
        pt: 'Navegue pelas categorias ou pesquise para encontrar cosméticos, telemóveis, televisores e moda.',
        ar: 'تصفح فئاتنا المتنوعة أو استخدم شريط البحث للعثور على مستحضرات التجميل والهواتف والتلفزيونات والأزياء الأصلية.',
        zh: '浏览我们多元的商品品类，或使用搜索栏查找正品美妆、智能手机、智能电视和时尚服饰。',
        de: 'Durchsuchen Sie Kategorien oder nutzen Sie die Suche für Kosmetik, Handys, Fernseher und Mode zu Top-Preisen.',
        hi: 'हमारी विभिन्न श्रेणियों को ब्राउज़ करें या सौंदर्य प्रसाधन, स्मार्टफोन, टीवी और फैशन उत्पाद खोजने के लिए खोज बार का उपयोग करें।'
      }
    },
    {
      step: '02',
      icon: ShoppingCart,
      title: {
        en: 'Add to Cart or Buy Now',
        fr: 'Ajouter au panier ou Acheter',
        rw: 'Shyira mu Gatebo cyangwa Gura',
        sw: 'Weka kwenye Kikapu au Nunua',
        es: 'Añadir al carrito o Comprar',
        pt: 'Adicionar ao carrinho ou Comprar',
        ar: 'أضف إلى السلة أو اشترِ الآن',
        zh: '加入购物车或直接购买',
        de: 'In den Warenkorb oder Jetzt kaufen',
        hi: 'कार्ट में जोड़ें या अभी खरीदें'
      },
      desc: {
        en: 'Select your preferred quantity, check availability, and add items to your cart or click "Buy Now" for immediate single-item checkout.',
        fr: 'Sélectionnez la quantité désirée, vérifiez la disponibilité, et ajoutez au panier ou cliquez sur Acheter maintenant.',
        rw: 'Nimara kubona igicuruzwa ukunda, kanda "Shyira mu Gatebo" cyangwa "Gura Nonaha". Ushobora guhindura ingano igihe cyose.',
        sw: 'Chagua idadi unayotaka, angalia upatikanaji, kisha weka kwenye kikapu au bonyeza "Nunua Sasa".',
        es: 'Selecciona la cantidad, comprueba disponibilidad y añade al carrito o pulsa "Comprar ahora".',
        pt: 'Escolha a quantidade, verifique a disponibilidade e adicione ao carrinho ou clique em Comprar já.',
        ar: 'حدد الكمية المطلوبة، وتحقق من توفر المخزون، وأضف العناصر إلى السلة أو انقر فوق "شراء الآن".',
        zh: '挑选所需数量与规格，加入购物车或一键点击“直接购买”进行快速结算。',
        de: 'Wählen Sie die Menge, prüfen Sie die Verfügbarkeit und legen Sie Artikel in den Warenkorb.',
        hi: 'अपनी पसंदीदा मात्रा चुनें, उपलब्धता जांचें और कार्ट में जोड़ें या सीधे चेकआउट के लिए "अभी खरीदें" पर क्लिक करें।'
      }
    },
    {
      step: '03',
      icon: Truck,
      title: {
        en: 'Enter Delivery Location',
        fr: 'Indiquer le lieu de livraison',
        rw: 'Andika Aho Bikugeraho',
        sw: 'Weka Mahali pa Uwasilishaji',
        es: 'Ingresar dirección de entrega',
        pt: 'Inserir local de entrega',
        ar: 'أدخل موقع التوصيل',
        zh: '填写送货地址与电话',
        de: 'Lieferadresse eingeben',
        hi: 'डिलीवरी का पता दर्ज करें'
      },
      desc: {
        en: 'Provide your name, contact phone number, and delivery address in Kigali (same-day) or upcountry provinces across Rwanda.',
        fr: 'Indiquez votre nom, numéro de téléphone et adresse à Kigali (le jour même) ou en province au Rwanda.',
        rw: 'Jya mu gatebo hanyuma ukande "Kugura". Uzabazwa amazina yawe, aho uherereye n\'aho biba bigomba kugezwa.',
        sw: 'Weka jina lako, nambari ya simu na anwani ya uwasilishaji mjini Kigali au mikoani kote nchini Rwanda.',
        es: 'Indica tu nombre, teléfono y dirección en Kigali (mismo día) o provincias de Ruanda.',
        pt: 'Forneça o seu nome, contacto telefónico e morada em Kigali ou províncias do Ruanda.',
        ar: 'أدخل اسمك ورقم الهاتف للتواصل وعنوان التوصيل في كيغالي (في نفس اليوم) أو المحافظات في جميع أنحاء رواندا.',
        zh: '填写您的收件人姓名、联系电话以及基加利市区或卢旺达各省份的详细配送地址。',
        de: 'Geben Sie Name, Telefonnummer und Lieferadresse in Kigali (am selben Tag) oder in Provinzen Ruandas an.',
        hi: 'किगाली (उसी दिन डिलीवरी) या पूरे रवांडा में डिलीवरी के लिए अपना नाम, फ़ोन नंबर और पता प्रदान करें।'
      }
    },
    {
      step: '04',
      icon: CreditCard,
      title: {
        en: 'Pay via Mobile Money USSD',
        fr: 'Paiement par Mobile Money USSD',
        rw: 'Kwishyura kuri USSD ya Telefoni',
        sw: 'Lipa kupitia USSD ya Simu',
        es: 'Pagar con Mobile Money USSD',
        pt: 'Pagar via USSD Mobile Money',
        ar: 'الدفع عبر رمز USSD للهاتف',
        zh: '通过手机移动钱包 USSD 付款',
        de: 'Zahlung per Mobile-Money-USSD',
        hi: 'मोबाइल मनी USSD से भुगतान करें'
      },
      desc: {
        en: 'USSD prompt opens automatically in your phone dialer! Supports MTN MoMo (*182*1*1*0780022600*AMOUNT#), MoMoPay (*182*8*1*2328354*AMOUNT#), and Airtel Money (*182*1*2*0780022600*AMOUNT#).',
        fr: 'Le code USSD s\'ouvre automatiquement! Compatible MTN MoMo (*182*1*1*0780022600*MONTANT#), MoMoPay (*182*8*1*2328354*MONTANT#) et Airtel Money.',
        rw: 'Kode ya USSD ifunguka mu buryo bwikora kuri telefoni yawe! MTN MoMo (*182*1*1*0780022600*AMOUNT#), MTN MoMoPay (*182*8*1*2328354*AMOUNT#) na Airtel Money.',
        sw: 'Msimbo wa USSD hufunguka moja kwa moja! Inasaidia MTN MoMo, MoMoPay na Airtel Money nchini Rwanda.',
        es: '¡El código USSD se abre directamente en tu teléfono! Compatible con MTN MoMo, MoMoPay y Airtel Money.',
        pt: 'O código USSD abre automaticamente no seu telemóvel! Suporta MTN MoMo, MoMoPay e Airtel Money.',
        ar: 'يفتح رمز USSD تلقائياً في طالب الهاتف! يدعم MTN MoMo و MoMoPay و Airtel Money في رواندا بالفرنك الرواندي.',
        zh: '手机拨号器将自动调起 USSD 支付指令！完全支持卢旺达主流 MTN MoMo、MoMoPay 商户码与 Airtel Money。',
        de: 'USSD-Code öffnet sich automatisch im Dialer! Unterstützt MTN MoMo, MoMoPay und Airtel Money.',
        hi: 'USSD कोड आपके फ़ोन डायलर में अपने आप खुल जाता है! यह MTN MoMo, MoMoPay और Airtel Money का समर्थन करता है।'
      }
    },
    {
      step: '05',
      icon: ShieldCheck,
      title: {
        en: 'Confirm & Receive Order',
        fr: 'Confirmer et recevoir la commande',
        rw: 'Kubikugezaho Byihuse',
        sw: 'Thibitisha na Pokea Agizo',
        es: 'Confirmar y recibir el pedido',
        pt: 'Confirmar e receber a encomenda',
        ar: 'تأكيد واستلام طلبك',
        zh: '确认付款并坐等收货',
        de: 'Bestätigen und Ware erhalten',
        hi: 'पुष्टि करें और ऑर्डर प्राप्त करें'
      },
      desc: {
        en: 'Click "I Have Already Paid" to submit your SMS transaction reference. Our team verifies payments promptly and delivers your order safely to your door.',
        fr: 'Cliquez sur "J\'ai déjà payé" pour soumettre la référence SMS. Notre équipe valide immédiatement et livre rapidement.',
        rw: 'Kanda "Narangije Kwishyura" wohereze nimero ya transaction. Ikipe yacu ihita ibyemeza maze igicuruzwa kigerezwe aho uri.',
        sw: 'Bofya "Nimeshalipa" kuweka nambari ya SMS ya muamala. Timu yetu huthibitisha haraka na kukuletea mpaka mlangoni.',
        es: 'Haz clic en "Ya he pagado" para enviar la referencia SMS. Nuestro equipo verifica y entrega en tu puerta.',
        pt: 'Clique em "Já paguei" para submeter a referência de SMS. A nossa equipa verifica e entrega em segurança.',
        ar: 'انقر فوق "لقد قمت بالدفع بالفعل" لإرسال الرقم المرجعي للرسالة القصيرة. يقوم فريقنا بالتحقق والتوصيل بأمان.',
        zh: '点击“我已完成付款”提交交易短信流水号，客服人员核实无误后将立即发货并将包裹安全送达您手中。',
        de: 'Klicken Sie auf "Ich habe bezahlt", um die SMS-Referenz zu übermitteln. Unser Team prüft und liefert zuverlässig.',
        hi: 'एसएमएस ट्रांजेक्शन रेफरेंस दर्ज करने के लिए "मैंने भुगतान कर दिया है" पर क्लिक करें। हमारी टीम तुरंत पुष्टि करती है और डिलीवरी करती है।'
      }
    }
  ];

  const header = headerTitles[currentLang] || headerTitles.en;

  return (
    <section className="py-12 sm:py-16 bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-[#EA580C] uppercase tracking-wider block mb-2">
            {header.badge}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {header.heading}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            {header.sub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="group relative bg-[#F8F9FA] hover:bg-orange-50/50 p-5 rounded-2xl border border-slate-200 transition-all duration-300 hover:shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#EA580C] shadow-2xs group-hover:bg-[#EA580C] group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs font-black text-slate-300 group-hover:text-orange-400">
                      {s.step}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-2 leading-snug">
                    {s.title[currentLang] || s.title.en}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {s.desc[currentLang] || s.desc.en}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <button
            onClick={onStartShopping}
            className="inline-flex items-center gap-2 py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm bg-[#EA580C] hover:bg-[#D94F04] text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            <span>{t.shopNow}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
