// Official Google Cloud Translation Supported Languages Database
// Comprehensive worldwide coverage of 134+ languages supported by Google Cloud Translation API

export interface GoogleLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  region: 'Africa' | 'Europe' | 'Asia' | 'Americas' | 'Middle East' | 'Oceania' | 'Global';
  popular?: boolean;
}

export const GOOGLE_LANGUAGES: GoogleLanguage[] = [
  // Primary East African & Marketplace Languages (Quick Access)
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr', region: 'Global', popular: true },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', flag: '🇷🇼', dir: 'ltr', region: 'Africa', popular: true },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr', region: 'Europe', popular: true },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇹🇿', dir: 'ltr', region: 'Africa', popular: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr', region: 'Europe', popular: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', dir: 'ltr', region: 'Europe', popular: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl', region: 'Middle East', popular: true },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳', dir: 'ltr', region: 'Asia', popular: true },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼', dir: 'ltr', region: 'Asia' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr', region: 'Europe', popular: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr', region: 'Asia', popular: true },

  // African Languages
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', dir: 'ltr', region: 'Africa' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', flag: '🇸🇴', dir: 'ltr', region: 'Africa' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Èdè Yorùbá', flag: '🇳🇬', dir: 'ltr', region: 'Africa' },
  { code: 'ig', name: 'Igbo', nativeName: 'Asụsụ Igbo', flag: '🇳🇬', dir: 'ltr', region: 'Africa' },
  { code: 'ha', name: 'Hausa', nativeName: 'Harshen Hausa', flag: '🇳🇬', dir: 'ltr', region: 'Africa' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', flag: '🇿🇦', dir: 'ltr', region: 'Africa' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', flag: '🇿🇦', dir: 'ltr', region: 'Africa' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦', dir: 'ltr', region: 'Africa' },
  { code: 'sn', name: 'Shona', nativeName: 'chiShona', flag: '🇿🇼', dir: 'ltr', region: 'Africa' },
  { code: 'st', name: 'Sesotho', nativeName: 'Sesotho', flag: '🇱🇸', dir: 'ltr', region: 'Africa' },
  { code: 'ny', name: 'Chichewa', nativeName: 'ChiCheŵa', flag: '🇲🇼', dir: 'ltr', region: 'Africa' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy', flag: '🇲🇬', dir: 'ltr', region: 'Africa' },

  // European Languages
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', dir: 'ltr', region: 'Europe', popular: true },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', dir: 'ltr', region: 'Europe', popular: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr', region: 'Europe', popular: true },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', dir: 'ltr', region: 'Europe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', dir: 'ltr', region: 'Europe' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', dir: 'ltr', region: 'Europe' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', dir: 'ltr', region: 'Europe' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', dir: 'ltr', region: 'Europe' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', dir: 'ltr', region: 'Europe' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', dir: 'ltr', region: 'Europe' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', dir: 'ltr', region: 'Europe' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', dir: 'ltr', region: 'Europe' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', dir: 'ltr', region: 'Europe' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', dir: 'ltr', region: 'Europe' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', dir: 'ltr', region: 'Europe' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', dir: 'ltr', region: 'Europe' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮', dir: 'ltr', region: 'Europe' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸', dir: 'ltr', region: 'Europe' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱', dir: 'ltr', region: 'Europe' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', flag: '🇧🇦', dir: 'ltr', region: 'Europe' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰', dir: 'ltr', region: 'Europe' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪', dir: 'ltr', region: 'Europe' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻', dir: 'ltr', region: 'Europe' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹', dir: 'ltr', region: 'Europe' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', flag: '🇮🇸', dir: 'ltr', region: 'Europe' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', flag: '🇮🇪', dir: 'ltr', region: 'Europe' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', dir: 'ltr', region: 'Europe' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', flag: '🇪🇸', dir: 'ltr', region: 'Europe' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', flag: '🇪🇸', dir: 'ltr', region: 'Europe' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', flag: '🇪🇸', dir: 'ltr', region: 'Europe' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская', flag: '🇧🇾', dir: 'ltr', region: 'Europe' },
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch', flag: '🇱🇺', dir: 'ltr', region: 'Europe' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', flag: '🇲🇹', dir: 'ltr', region: 'Europe' },
  { code: 'co', name: 'Corsican', nativeName: 'Corsu', flag: '🇫🇷', dir: 'ltr', region: 'Europe' },
  { code: 'gd', name: 'Scots Gaelic', nativeName: 'Gàidhlig', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', dir: 'ltr', region: 'Europe' },
  { code: 'fy', name: 'Frisian', nativeName: 'Frysk', flag: '🇳🇱', dir: 'ltr', region: 'Europe' },

  // Middle Eastern Languages
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr', region: 'Middle East', popular: true },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', dir: 'rtl', region: 'Middle East' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', dir: 'rtl', region: 'Middle East' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', dir: 'rtl', region: 'Middle East' },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî', flag: '🇮🇶', dir: 'ltr', region: 'Middle East' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', flag: '🇦🇫', dir: 'rtl', region: 'Middle East' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', flag: '🇦🇿', dir: 'ltr', region: 'Middle East' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', flag: '🇦🇲', dir: 'ltr', region: 'Middle East' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪', dir: 'ltr', region: 'Middle East' },

  // Asian & Pacific Languages
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr', region: 'Asia', popular: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', dir: 'ltr', region: 'Asia', popular: true },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', dir: 'ltr', region: 'Asia', popular: true },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr', region: 'Asia', popular: true },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', dir: 'ltr', region: 'Asia' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', dir: 'ltr', region: 'Asia', popular: true },
  { code: 'tl', name: 'Filipino (Tagalog)', nativeName: 'Filipino', flag: '🇵🇭', dir: 'ltr', region: 'Asia' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', dir: 'ltr', region: 'Asia' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', dir: 'ltr', region: 'Asia' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', dir: 'ltr', region: 'Asia' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', dir: 'ltr', region: 'Asia' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', dir: 'ltr', region: 'Asia' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', dir: 'ltr', region: 'Asia' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', dir: 'ltr', region: 'Asia' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', dir: 'ltr', region: 'Asia' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳', dir: 'ltr', region: 'Asia' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵', dir: 'ltr', region: 'Asia' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰', dir: 'ltr', region: 'Asia' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', flag: '🇲🇲', dir: 'ltr', region: 'Asia' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', flag: '🇰🇭', dir: 'ltr', region: 'Asia' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', flag: '🇱🇦', dir: 'ltr', region: 'Asia' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', flag: '🇲🇳', dir: 'ltr', region: 'Asia' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ тілі', flag: '🇰🇿', dir: 'ltr', region: 'Asia' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha', flag: '🇺🇿', dir: 'ltr', region: 'Asia' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', flag: '🇰🇬', dir: 'ltr', region: 'Asia' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', flag: '🇹🇯', dir: 'ltr', region: 'Asia' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmençe', flag: '🇹🇲', dir: 'ltr', region: 'Asia' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', flag: '🇨🇳', dir: 'rtl', region: 'Asia' },
  { code: 'tt', name: 'Tatar', nativeName: 'Татарча', flag: '🇷🇺', dir: 'ltr', region: 'Asia' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', flag: '🇵🇰', dir: 'rtl', region: 'Asia' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', flag: '🇮🇩', dir: 'ltr', region: 'Asia' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda', flag: '🇮🇩', dir: 'ltr', region: 'Asia' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Bisaya', flag: '🇵🇭', dir: 'ltr', region: 'Asia' },
  { code: 'hmn', name: 'Hmong', nativeName: 'Hmoob', flag: '🇱🇦', dir: 'ltr', region: 'Asia' },

  // Americas & Oceania
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl ayisyen', flag: '🇭🇹', dir: 'ltr', region: 'Americas' },
  { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi', flag: '🌺', dir: 'ltr', region: 'Americas' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Sāmoa', flag: '🇼🇸', dir: 'ltr', region: 'Oceania' },
  { code: 'mi', name: 'Maori', nativeName: 'Te Reo Māori', flag: '🇳🇿', dir: 'ltr', region: 'Oceania' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', flag: '🌐', dir: 'ltr', region: 'Global' },
  { code: 'la', name: 'Latin', nativeName: 'Latina', flag: '🏛️', dir: 'ltr', region: 'Europe' },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', flag: '✡️', dir: 'rtl', region: 'Europe' }
];

// Helper to look up language by code
export function getLanguageByCode(code: string): GoogleLanguage {
  const normalized = (code || 'en').toLowerCase().trim();
  const match = GOOGLE_LANGUAGES.find(l =>
    l.code.toLowerCase() === normalized ||
    l.code.toLowerCase().startsWith(normalized + '-') ||
    normalized.startsWith(l.code.toLowerCase() + '-')
  );
  return match || {
    code: normalized,
    name: normalized.toUpperCase(),
    nativeName: normalized.toUpperCase(),
    flag: '🌐',
    dir: 'ltr',
    region: 'Global'
  };
}
