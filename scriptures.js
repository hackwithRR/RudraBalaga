/* Unified Sacred Scriptures e-reader (shared by index.html & essentials.html).
   Usage: window.openScriptures() opens the picker; picking one opens the
   e-reader with font +/- controls. __NAMAKAM__/__CHAMAKAM__ tokens are
   replaced at build time with the full texts. */
(function () {
    var PLACEHOLDER = '<p class="scripture-placeholder">(ಪಠ್ಯ ಶೀಘ್ರವೇ ಸೇರಿಸಲಾಗುವುದು — placeholder, full scripture to be added)</p>';
    var SCRIPTURES = [
      { id: 'guru-vandhana', kn: 'ಗುರು ವಂದನಾ', en: 'Guru Vandhana', icon: 'self_improvement',
    content: '<p class="text-center font-bold text-primary">ಶ್ರೀ ಗುರು ಸ್ತೋತ್ರಂ (ಗುರು ವಂದನಂ)</p>' +
      '<p>ಅಖಂಡಮಂಡಲಾಕಾರಂ ವ್ಯಾಪ್ತಂ ಯೇನ ಚರಾಚರಮ್ ।<br>ತತ್ಪದಂ ದರ್ಶಿತಂ ಯೇನ ತಸ್ಮೈ ಶ್ರೀಗುರವೇ ನಮಃ ॥ 1 ॥</p>' +
      '<p>ಅಜ್ಞಾನತಿಮಿರಾಂಧಸ್ಯ ಜ್ಞಾನಾಂಜನಶಲಾಕಯಾ ।<br>ಚಕ್ಷುರುನ್ಮೀಲಿತಂ ಯೇನ ತಸ್ಮೈ ಶ್ರೀಗುರವೇ ನಮಃ ॥ 2 ॥</p>' +
      '<p>ಗುರುರ್ಬ್ರಹ್ಮಾ ಗುರುರ್ವಿಷ್ಣುಃ ಗುರುರ್ದೇವೋ ಮಹೇಶ್ವರಃ ।<br>ಗುರುರೇವ ಪರಂಬ್ರಹ್ಮ ತಸ್ಮೈ ಶ್ರೀಗುರವೇ ನಮಃ ॥ 3 ॥</p>' +
      '<p>ಸ್ಥಾವರಂ ಜಂಗಮಂ ವ್ಯಾಪ್ತಂ ಯತ್ಕಿಂಚಿತ್ಸಚರಾಚರಮ್ ।<br>ತತ್ಪದಂ ದರ್ಶಿತಂ ಯೇನ ತಸ್ಮೈ ಶ್ರೀಗುರವೇ ನಮಃ ॥ 4 ॥</p>' +
      '<p>ಚಿನ್ಮಯಂ ವ್ಯಾಪಿಯತ್ಸರ್ವಂ ತ್ರೈಲೋಕ್ಯಂ ಸಚರಾಚರಮ್ ।<br>ತತ್ಪದಂ ದರ್ಶಿತಂ ಯೇನ ತಸ್ಮೈ ಶ್ರೀಗುರವೇ ನಮಃ ॥ 5 ॥</p>' +
      '<p>ತ್ಸರ್ವಶ್ರುತಿಶಿರೋರತ್ನವಿರಾಜಿತ ಪದಾಂಬುಜಃ ।<br>ವೇದಾಂತಾಂಬುಜಸೂರ್ಯೋಯಃ ತಸ್ಮೈ ಶ್ರೀಗುರವೇ ನಮಃ ॥ 6 ॥</p>' +
      '<p>ಚೈತನ್ಯಃ ಶಾಶ್ವತಃಶಾಂತೋ ವ್ಯೋಮಾತೀತೋ ನಿರಂಜನಃ ।<br>ಬಿಂದುನಾದ ಕಲಾತೀತಃ ತಸ್ಮೈ ಶ್ರೀಗುರವೇ ನಮಃ ॥ 7 ॥</p>' +
      '<p>ಜ್ಞಾನಶಕ್ತಿಸಮಾರೂಢಃ ತತ್ತ್ವಮಾಲಾವಿಭೂಷಿತಃ ।<br>ಭುಕ್ತಿಮುಕ್ತಿಪ್ರದಾತಾ ಚ ತಸ್ಮೈ ಶ್ರೀಗುರವೇ ನಮಃ ॥ 8 ॥</p>' +
      '<p>ಅನೇಕಜನ್ಮಸಂಪ್ರಾಪ್ತ ಕರ್ಮಬಂಧವಿದಾಹಿನೇ ।<br>ಆತ್ಮಜ್ಞಾನಪ್ರದಾನೇನ ತಸ್ಮೈ ಶ್ರೀಗುರವೇ ನಮಃ ॥ 9 ॥</p>' +
      '<p>ಶೋಷಣಂ ಭವಸಿಂಧೋಶ್ಚ ಜ್ಞಾಪಣಂ ಸಾರಸಂಪದಃ ।<br>ಗುರೋಃ ಪಾದೋದಕಂ ಸಮ್ಯಕ್ ತಸ್ಮೈ ಶ್ರೀಗುರವೇ ನಮಃ ॥ 10 ॥</p>' +
      '<p>ನ ಗುರೋರಧಿಕಂ ತತ್ತ್ವಂ ನ ಗುರೋರಧಿಕಂ ತಪಃ ।<br>ತತ್ತ್ವಜ್ಞಾನಾತ್ಪರಂ ನಾಸ್ತಿ ತಸ್ಮೈ ಶ್ರೀಗುರವೇ ನಮಃ ॥ 11 ॥</p>' +
      '<p>ಮನ್ನಾಥಃ ಶ್ರೀಜಗನ್ನಾಥಃ ಮದ್ಗುರುಃ ಶ್ರೀಜಗದ್ಗುರುಃ ।<br>ಮದಾತ್ಮಾ ಸರ್ವಭೂತಾತ್ಮಾ ತಸ್ಮೈ ಶ್ರೀಗುರವೇ ನಮಃ ॥ 12 ॥</p>' +
      '<p>ಗುರುರಾದಿರನಾದಿಶ್ಚ ಗುರುಃ ಪರಮದೈವತಮ್ ।<br>ಗುರೋಃ ಪರತರಂ ನಾಸ್ತಿ ತಸ್ಮೈ ಶ್ರೀಗುರವೇ ನಮಃ ॥ 13 ॥</p>' +
      '<p>ತ್ವಮೇವ ಮಾತಾ ಚ ಪಿತಾ ತ್ವಮೇವ<br>ತ್ವಮೇವ ಬಂಧುಶ್ಚ ಸಖಾ ತ್ವಮೇವ ।<br>ತ್ವಮೇವ ವಿದ್ಯಾ ದ್ರವಿಣಂ ತ್ವಮೇವ<br>ತ್ವಮೇವ ಸರ್ವಂ ಮಮ ದೇವ ದೇವ ॥ 14 ॥</p>' },
      { id: 'ganesha-atharvashirsha', kn: 'ಗಣೇಶ ಆಥರ್ವಶೀರ್ಷ', en: 'Ganesha Atharvashirsha', icon: 'temple_hindu' },
      { id: 'mahanyasa', kn: 'ಮಹಾನ್ಯಾಸ', en: 'Mahanyasa', icon: 'auto_awesome' },
      { id: 'rudra-namakam', kn: 'ರುದ್ರ ನಮಕಮ್', en: 'Rudra Namaka', icon: 'menu_book', content: "<p class=\"text-center text-on-surface-variant kannada-text\">ಕೃಷ್ಣ ಯಜುರ್ವೇದೀಯ ತೈತ್ತಿರೀಯ ಸಂಹಿತಾ\nಚತುರ್ಥಂ-ವೈಁಶ್ವದೇವಂ ಕಾಂಡಂ ಪಂಚಮಃ ಪ್ರಪಾಠಕಃ\n\nಓಂ ನಮೋ ಭಗವತೇ॑ ರುದ್ರಾ॒ಯ ॥\nನಮ॑ಸ್ತೇ ರುದ್ರ ಮ॒ನ್ಯವ॑ ಉ॒ತೋತ॒ ಇಷ॑ವೇ॒ ನಮಃ॑ ।\nನಮ॑ಸ್ತೇ ಅಸ್ತು॒ ಧನ್ವ॑ನೇ ಬಾ॒ಹುಭ್ಯಾಂತ ತೆ॒ ನಮಃ॑ ॥\n\nಯಾ ತು ಇಷುಃ ಶಿವತಮಾ ಶಿವಂ ಬಭೂವ ತೆ ಧನುಃ ।\nಶಿವಾ ಶರವ್ಯಾ ಯಾ ತವ ತಯಾ ನೋ ರುದ್ರ ಮೃಡಯ ।\n\nಯಾ ತೆ ರುದ್ರ ಶಿವಾ ತನೂರಘೋರಾಽಪಾಪಕಾಶಿನೀ ।\nತಯಾ ನಸ್ತನುವಾ ಶಂತಮಯಾ ಗಿರಿಶಂತಾಭಿಚಾಕಶೀಹಿ ॥\n\nಯಾಮಿಷುಂ ಗಿರಿಶಂತ ಹಸ್ತೆ ಬಿಭರ್ಷ್ಯಸ್ತವೇ ।\nಶಿವಾಂ ಗಿರಿತ್ರ ತಾಂ ಕುರು ಮಾ ಹಿಗ್ಂಸೀಃ ಪುರುಷಂ ಜಗತ್ ॥\n\nಶಿವೇನ ವಚಸಾ ತ್ವಾ ಗಿರಿಶಾಚ್ಛಾ ವದಾಮಸಿ ।\nಯಥಾ ನಃ ಸರ್ವಮಿಜ್ಜಗದಯಕ್ಷ್ಮಂ ಸುಮನಾ ಅಸತ್ ॥\n\nಅಧ್ಯವೋಚದಧಿವಕ್ತಾ ಪ್ರಥಮೋ ದೈವ್ಯೋ ಭಿಷಕ್ ।\nಅಹೀಗ್ಶ್ಚ ಸರ್ವಾಂಜಂಭಯನ್-ಥ್ಸರ್ವಾಂಚ ಯಾತುಧಾನ್ಯಃ ॥\n\nಅಸೌ ಯಸ್ತಾಮ್ರೋ ಅರುಣ ಉತ ಬಭ್ರುಸ್ಸುಮಂಗಲಃ ।\nಯೇ ಚೇಮಾಗ್ಂ ರುದ್ರಾ ಅಭಿತೋ ದಿಕ್ಷು ಶ್ರಿತಾಃ ಸಹಸ್ರಶೋಽವೈಷಾಗ್ಂ ಹೇಡ ಈಮಹೇ ॥\n\nಅಸೌ ಯೋಽವಸರ್ಪತಿ ನೀಲಗ್ರೀವೋ ವಿಲೋಹಿತಃ ।\nಉತೈನಂ ಗೋಪಾ ಅದೃಶನ್ನದೃಶನ್ನುದಹಾರ್ಯಃ ।\nಉತೈನಂ-ವಿಁಶ್ವಾ ಭೂತಾನಿ ಸ ದೃಷ್ಟೋ ಮೃಡಯಾತಿ ನಃ ॥\n\nನಮೋಽಸ್ತು ನೀಲಗ್ರೀವಾಯ ಸಹಸ್ರಾಕ್ಷಾಯ ಮೀಢುಷೇ ।\nಅಥೋ ಯೇ ಅಸ್ಯ ಸತ್ವಾನೋಽಹಂ ತೆಭ್ಯೋಽಕರ್ನಮಃ ॥\n\nಪ್ರಮುಂಚ ಧನ್ವನಸ್ತವಮುಭಯೋರಾರ್ತ್ನಿ ಯೋರ್ಜ್ಯಾಮ್ ।\nಯಾಶ್ಚ ತೆ ಹಸ್ತೆ ಇಷವಃ ಪರಾ ತಾ ಭಗವೋ ವಪ ॥\n\nಅವತತ್ಯ ಧನುಸ್ತವಗ್ಂ ಸಹಸ್ರಾಕ್ಷ ಶತೇಷುಧೇ ।\nನಿಶೀರ್ಯ ಶಲ್ಯಾನಾಂ ಮುಖಾ ಶಿವೋ ನಃ ಸುಮನಾ ಭವ ॥\n\nವಿಜ್ಯಂ ಧನುಃ ಕಪರ್ದಿನೋ ವಿಶಲ್ಯೋಬಾಣವಾಗ್ಂ ಉತ ।\nಅನೇಶನ್ನಸ್ಯೇಷವ ಆಭುರಸ್ಯ ನಿಷಂಗಥಿಃ ॥\n\nಯಾ ತೆ ಹೇತಿರ್ಮೀಢುಷ್ಟಮಹಸ್ತೆ ಬಭೂವ ತೆ ಧನುಃ ।\nತಯಾಽಸ್ಮಾನ್, ವಿಶ್ವತಸ್ತ್ವಮಯಕ್ಷ್ಮಯಾ ಪರಿಬ್ಭುಜ ॥\n\nನಮೋಸ್ತೇ ಅಸ್ತ್ವಾಯುಧಾಯಾನಾತತಾಯ ಧೃಷ್ಣವೇ ।\nಉಭಾಭ್ಯಾಂತ ತೆ ನಮೋ ಬಾಹುಭ್ಯಾಂ ತವ ಧನ್ವನೆ ॥\n\nಪರಿ ತೆ ಧನ್ವನೋ ಹೇತಿರಸ್ಮಾನ್ ವೃಣಕ್ತು ವಿಶ್ವತಃ ।\nಅಥೋ ಯ ಇಷುಧಿಸ್ತವಾರೇ ಅಸ್ಮನ್ನಿಧೇಹಿ ತಮ್ ॥ 1 ॥\n\nಶ್ರೀ ಶಂಭವೇ ನಮಃ ॥\nನಮೋಸ್ತೇ ಅಸ್ತು ಭಗವನ್-ವಿಶ್ವೇಶ್ವರಾಯ ಮಹಾದೇವಾಯ ತ್ರ್ಯಂಬಕಾಯ ತ್ರಿಪುರಾಂತಕಾಯ ತ್ರಿಕಾಗ್ನಿಕಾಲಾಯ ಕಾಲಾಗ್ನಿರುದ್ರಾಯ ನೀಲಕಂಠಾಯ ಮೃತ್ಯುಂಜಯಾಯ ಸರ್ವೇಶ್ವರಾಯ ಸದಾಶಿವಾಯ [ಶಂಕರಾಯ] ಶ್ರೀಮನ್-ಮಹಾದೇವಾಯನಮಃ ।\n\nನಮೋಂ ಹಿರಣ್ಯ ಬಾಹವೇ ಸೇನಾಂಯೇ ದಿಶಾಂ ಚ ಪತಯೇ ನಮೋಂ ವೃಕ್ಷೇಭ್ಯೋ ಹರಿಕೇಶೇಭ್ಯಃ ಪಶೂನಾಂ ಪತಯೇ ನಮಃ ಸಸ್ಪಿಂಜರಾಯ ತ್ವಿಷೀಮತೇ ಪಥೀನಾಂ ಪತಯೇ ನಮೋಂ ಬಭ್ಲುಶಾಯ ವಿವ್ಯಾಧಿನೆಽನ್ನಾಂ ಪತಯೇ ನಮೋಂ ಹರಿಕೇಶಾಯೋಪವೀತಿನೆ ಪುಷ್ಟಾನಾಂ ಪತಯೇ ನಮೋಂ ಭವಸ್ಯ ಹೇತ್ಯೈ ಜಗತಾಂ ಪತಯೇ ನಮೋಂ ರುದ್ರಾಯಾತತಾವಿನೆ ಕ್ಷೇತ್ರಾಣಾಂ ಪತಯೇ ನಮೋಂ ಸೂತಾಯಾಹಂತಿಯಾಯ ವನಾನಾಂ ಪತಯೇ ನಮೋಂ ರೋಹಿತಾಯ ಸ್ಥಪತಯೇ ವೃಕ್ಷಾಣಾಂ ಪತಯೇ ನಮೋಂ ಮಂತ್ರಿಣೆ ವಾಣಿಜಾಯ ಕಕ್ಷಾಣಾಂ ಪತಯೇ ನಮೋಂ ಭುವಂತಯೇ ವಾರಿವಸ್ಕೃತಾ-ಯೌಷಧೀನಾಂ ಪತಯೇ ನಮೋಂ ಉಚ್ಚೈರ್ಘೋಷಾಯಾಕ್ರಂದಯತೇ ಪತ್ತೀನಾಂ ಪತಯೇ ನಮಃ ಕೃತ್ಸ್ನವೀತಾಯ ಧಾವತೆ ಸತ್ತ್ವನಾಂ ಪತಯೇ ನಮಃ ॥ 2 ॥\n\nನಮಃ ಸಹಮಾನಾಯ ನಿವ್ಯಾಧಿನ ಆವ್ಯಾಧಿನೀನಾಂ ಪತಯೇ ನಮಃ ಕಕುಭಾಯ ನಿಷಂಗಿಣೆಽಸ್ತೇನಾಂ ಪತಯೇ ನಮೋಂ ನಿಷಂಗಿಣ ಇಷುಧಿಮತೆ ತಸ್ಕರಾಣಾಂ ಪತಯೇ ನಮೋಂ ವಂಚತೆ ಪರಿವಂಚತೆ ಸ್ತಾಯೂನಾಂ ಪತಯೇ ನಮೋಂ ನಿಚೇರವೆ ಪರಿಚರಾಯಾರಣ್ಯಾನಾಂ ಪತಯೇ ನಮಃ ಸೃಕಾವಿಭ್ಯೋ ಜಿಘಾಗ್ಂಸದ್ಭ್ಯೋ ಮುಷ್ಣತಾಂ ಪತಯೇ ನಮೋಂ ಉಸಿಮದ್ಭ್ಯೋ ನಕ್ತಂಚರದ್ಭ್ಯಃ ಪ್ರಕೃಂತಾನಾಂ ಪತಯೇ ನಮೋಂ ಉಷ್ಣೀಷಿಣೆ ಗಿರಿಚರಾಯ ಕುಲುಂಚಾನಾಂ ಪತಯೇ ನಮೋಂ ಇಷುಮದ್ಭ್ಯೋ ಧನ್ವಾವಿಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ಆತನ್-ವಾಣಿಬ್ಯಹಃ ಪ್ರತಿದಧಾನೆಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ಆಯಚ್ಛದ್ಭ್ಯೋ ವಿಸೃಜದ್ಭ್ಯಹ್ಸ್ಚ ವೋ ನಮೋಂ ಆತ್ಮದ್ಭ್ಯೋಂ ವಿದ್ಯದ್ಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ಆಸೀನೆಭ್ಯೋಂ ಶಯಾನೆಭ್ಯಶ್ಚ ವೋ ನಮಃ ಸ್ವಪದ್ಭ್ಯೋಂ ಜಾಗ್ರದ್ಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ಸ್ತಿಷ್ಠದ್ಭ್ಯೋಂ ಧಾವದ್ಭ್ಯಶ್ಚ ವೋ ನಮಃ ಸಭಾಭ್ಯಹ್ಸ್ಚ ಸಭಾಪತಿಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ಅಶ್ವೇಭ್ಯೋಂಽಶ್ವಪತಿಭ್ಯಶ್ಚ ವೋ ನಮಃ ॥ 3 ॥\n\nನಮೋಂ ಆವ್ಯಾಧಿನೀಭ್ಯೋಂ ವಿವಿಧ್ಯಂತೀಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ಉಗಣಾಭ್ಯಸ್ತೃಗ್ಂ-ಹತೀಭ್ಯಹ್ಸ್ಚ ವೋ ನಮೋಂ ಗೃತ್ಸೆಭ್ಯೋಂ ಗೃತ್ಸಪತಿಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ವ್ರಾತೆಭ್ಯಹ್ಸ್ಚ ವ್ರಾತಪತಿಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ಗಣೆಭ್ಯೋಂ ಗಣಪತಿಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ವಿರೂಪೆಭ್ಯೋಂ ವಿಶ್ವರೂಪೆಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ಮಹದ್ಭ್ಯಹ್ಸ್ಚ, ಕ್ಷುಲ್ಲಕೆಭ್ಯಹ್ಸ್ಚ ವೋ ನಮೋಂ ರಥಿಭ್ಯೋಂಽರಥೆಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ರಥೇಭ್ಯೋಂ ರಥಪತಿಭ್ಯಶ್ಚ ವೋ ನಮಃ ಸೇನಾಭ್ಯಹ್ಸ್ಚ ಸೇನಾನಿಭ್ಯಶ್ಚ ವೋ ನಮಃ ಕ್ಷತ್ತೃಭ್ಯಹ್ಸ್ಚ ಸಂಗ್ರಹೀತೃಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ತಕ್ಷಭ್ಯೋಂ ರಥಕಾರೆಭ್ಯಶ್ಚ ವೋ ನಮಃ ಕುಲಾಲೆಭ್ಯಹ್ಸ್ಚ ಕರ್ಮಾರೆಭ್ಯಶ್ಚ ವೋ ನಮಃ ಪುಂಜಿಷ್ಟೆಭ್ಯೋಂ ನಿಷಾದೆಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ಇಷುಕೃದ್ಭ್ಯೋಂ ಧನ್ವಕೃದ್ಭ್ಯಶ್ಚ ವೋ ನಮೋಂ ಮೃಗಯುಭ್ಯಹ್ಸ್ಚ ಶ್ವನಿಭ್ಯಶ್ಚ ವೋ ನಮೋ-ಶ್ವಭ್ಯಹ್ಸ್ಚ ಶ್ವಪತಿಭ್ಯಶ್ಚ ವೋ ನಮಃ ॥ 4 ॥\n\nನಮೋಂ ಭವಾಯ ಚ ರುದ್ರಾಯ ಚ ನಮಃ ಶರವಾಯ ಚ ಪಶುಪತಯೇ ಚ ನಮೋಂ ನೀಲಗ್ರೀವಾಯ ಚ ಶಿತಿಕಂಠಾಯ ಚ ನಮಃ ಕಪರ್ದಿನೆಯಹ್ಸ್ಚ ಚ ವ್ಯುಪ್ತಕೇಶಾಯ ಚ ನಮಃ ಸಹಸ್ರಾಕ್ಷಾಯಹ್ಸ್ಚ ದ ಶತಧನ್ವನೆಯಹ್ಸ್ಚ ನಮೋಂ ಗಿರಿಶಾಯಹ್ಸ್ಚ ಶಿಪಿವಿಷ್ಟಾಯಹ್ಸ್ಚ ನಮೋಂ ಮೀಢುಷ್ಟಮಾಯಹ್ಸ್ಚ ಇಷುಮತೆ ನಮೋಂ ಹ್ರಸ್ವಾಯಹ್ಸ್ಚ ವಾಮನಾಯಹ್ಸ್ಚ ನಮೋಂ ಬೃಹತಯೇಯಹ್ಸ್ಚ ವರ್ಷೀಯಸೇಯಹ್ಸ್ಚ ನಮೋಂ ವೃದ್ಧಾಯಹ್ಸ್ಚ ಸಂವೃಧ್ವನೆಯಹ್ಸ್ಚ ನಮೋಂ ಅಗ್ರಿಯಾಯ ಚ ಪ್ರಥಮಾಯಹ್ಸ್ಚ ನಮೋಂ ಆಶವೆಯಹ್ಸ್ಚ ಆಜಿರಾಯಹ್ಸ್ಚ ನಮಃ ಶೀಘ್ರಿಯಾಯಹ್ಸ್ಚ ಶೀಭ್ಯಾಯಹ್ಸ್ಚ ನಮೋಂ ಊರ್ಮ್ಯಾಯ ಚ ಅವಸ್ವನ್ಯಾಯಹ್ಸ್ಚ ನಮಃ ಸ್ರೋತಸ್ಯಾಯಹ್ಸ್ಚ ದ್ವೀಪ್ಯಾಯಹ್ಸ್ಚ ನಮೋಂ ಸಹಸ್ರಶೋ ಯೇ ರುದ್ರಾ ಅಧಿಭೂಮ್ಯಾಮ್ ತೆಷಾಗ್ಂ ಸಹಸ್ರಯೋಜನೆಽವಧನ್ವಾನಿ ತನ್ಮಸಿ ನಮೋಂ ರುದ್ರಾಯಹ್ಸ್ಚ ವಿಷ್ಣವೇಯಹ್ಸ್ಚ ಮಾ ನಃ ಸಹಾಯತೇ ಮಾ ತೆ ನಮಃ ಪರಾಚೀರ್ದಶ್ ದಕ್ಷಿಣಾ ದಶ ಪ್ರತೀಚೀರ್ದಶ-ದಿಚೀರ್ದಶ ಉದ್ಧಸ್ತೆಭ್ಯೋಂ ನಮೋಂತೆ ನಹಿ ದ್ವಿಷ್ಮೋ ಯಶ್ಚ ನೋ ದ್ವೇಷ್ಟಿ ತಂ-ವೋಁ ಜಂಭೆ ದಧಾಮಿ ತೆ ದಿವಸ್ಮಿಷ್ಟೇಭ್ಯೋಂ ನಮೋಂತೆ ನಹಿ ಯಶ್ಚ ನೋ ದ್ವೇಷ್ಟಿ ತಂ-ವೋಁ ಜಂಭೆ ದಧಾಮಿ ಸದಾಶಿವೋಂ ॥ 5 ॥\n\nನಮೋಂ ಜ್ಯೇಷ್ಠಾಯ ಚ ಕನಿಷ್ಠಾಯ ಚ ನಮಃ ಪೂರ್ವಜಾಯ ಚಾಪರಜಾಯ ಚ ನಮೋಂ ಮಧ್ಯಮಾಯ ಚಾಪಗಲ್ಭಾಯ ಚ ನಮೋಂ ಜಘನ್ಯಾಯ ಚ ಬುಧ್ನಿಯಾಯ ಚ ನಮಃ ಸೋಭ್ಯಾಯ ಚ ಪ್ರತಿಸರ್ಯಾಯ ಚ ನಮೋಂ ಯಾಮ್ಯಾಯ ಚ ಕ್ಷೇಮ್ಯಾಯ ಚ ನಮೋಂ ಉರ್ವರ್ಯಾಯ ಚ ಖಲ್ಯಾಯ ಚ ನಮಃ ಶ್ಲೋಕ್ಯಾಯ ಚಾಽವಸಾನ್ಯಾಯ ಚ ನಮೋಂ ವನ್ಯಾಯ ಚ ಕಕ್ಷ್ಯಾಯ ಚ ನಮಃ ಶ್ರವಾಯ ಚ ಪ್ರತಿಶ್ರವಾಯ ಚ ನಮೋಂ ಆಶುಷೇಣಾಯ ಚಾಶುರಥಾಯ ಚ ನಮಃ ಶೂರಾಯ ಚಾವಭಿಂದತೆ ಚ ನಮೋಂ ವರ್ಮಿಣೆಯಹ್ಸ್ಚ ವರೂಥಿನೆಯಹ್ಸ್ಚ ನಮೋಂ ಬಿಲ್ಮಿನೆಯಹ್ಸ್ಚ ಕವಿನೆಯಹ್ಸ್ಚ ನಮಃ ಶ್ರುತಾಯ ಚ ಶ್ರುತಸೇನಾಯಹ್ಸ್ಚ ನಮೋಂ ದಂಡುಭ್ಯಾಯ ಚಾಹನನ್ಯಾಯ ಚ ನಮೋಂ ಧೃಷ್ಣವೇಯಹ್ಸ್ಚ ಪ್ರಮೃಶಾಯಹ್ಸ್ಚ ನಮೋಂ ದೂತಾಯ ಚಾಪ್ರಹಿತಾಯ ಚ ನಮೋಂ ನಿಷಂಗಿಣೆಯಹ್ಸ್ಚ ಇಷುಧಿಮತೆಯಹ್ಸ್ಚ ನಮೋಂ ತೀಕ್ಷ್ಣೇಷ್ವೇ ಚಾಯುಧಿನೆಯಹ್ಸ್ಚ ನಮಃ ಸ್ವಾಯುಧಾಯಹ್ಸ್ಚ ಸುಧನ್ವನೆಯಹ್ಸ್ಚ ನಮಃ ಸೃತ್ಯಾಯಹ್ಸ್ಚ ಪಥ್ಯಾಯ ಚ ನಮಃ ಕಾಟ್ಯಾಯ ಚ ನೀಪ್ಯಾಯ ಚ ನಮಃ ಸೂದ್ಯಾಯ ಚ ಸರಸ್ಯಾಯ ಚ ನಮೋಂ ನಾದ್ಯಾಯ ಚ ವೈಶಂತಾಯ ಚ ನಮಃ ಕೂಪ್ಯಾಯ ಚಾವಟ್ಯಾಯ ಚ ನಮೋಂ ವರ್ಷ್ಯಾಯ ಚಾವರ್ಷ್ಯಾಯ ಚ ನಮೋಂ ಮೇಘ್ಯಾಯ ಚ ವಿದ್ಯುತ್ಯಾಯ ಚ ನಮ ಈಧ್ರಿಯಾಯ ಚಾತಪ್ಯಾಯ ಚ ನಮೋಂ ವಾತ್ಯಾಯ ಚ ರೇಷ್ಮಿಯಾಯ ಚ ನಮೋಂ ವಾಸ್ತುಪ್ಯಾಯ ಚ ವಾಸ್ತುಪಾಯ ಚ ನಮೋಂ ಸಹಸ್ತಾಣಿ ಸಹಸ್ಧಾ ಬಾಹುವಸ್ತವ ಹೇತಯಃ ತಾಸಾಮೀಶಾನೋ ಭಗವಃ ಪರಾಚೀರ್ದಶ ದಕ್ಷಿಣಾ ದಶ ಪ್ರತೀಚೀರ್ದಶ-ದಿಚೀರ್ದಶ ಉದ್ಧಸ್ತೆಭ್ಯೋಂ ನಮೋಂತೆ ನಹಿ ಯಶ್ಚ ನೋ ದ್ವೇಷ್ಟಿ ತಂ-ವೋಁ ಜಂಭೆ ದಧಾಮಿ ತೆ ದಿವಸ್ಮಿಷ್ಟೆಭ್ಯೋಂ ನಮೋಂತೆ ನಹಿ ಯಶ್ಚ ನೋ ದ್ವೇಷ್ಟಿ ತಂ-ವೋಁ ಜಂಭೆ ದಧಾಮಿ ಸದಾಶಿವೋಂ ॥ 6 ॥\n\nನಮೋಂ ಜ್ಯೇಷ್ಠಾಯ ಚ ಕನಿಷ್ಠಾಯ ಚ ನಮಃ ಪೂರ್ವಜಾಯ ಚಾಪರಜಾಯ ಚ ನಮೋಂ ಮಧ್ಯಮಾಯ ಚಾಪಗಲ್ಭಾಯ ಚ ನಮೋಂ ಜಘನ್ಯಾಯ ಚ ಬುಧ್ನಿಯಾಯ ಚ ನಮಃ ಸೋಭ್ಯಾಯ ಚ ಪ್ರತಿಸರ್ಯಾಯ ಚ ನಮೋಂ ಯಾಮ್ಯಾಯ ಚ ಕ್ಷೇಮ್ಯಾಯ ಚ ನಮೋಂ ಉರ್ವರ್ಯಾಯ ಚ ಖಲ್ಯಾಯ ಚ ನಮಃ ಶ್ಲೋಕ್ಯಾಯ ಚಾಽವಸಾನ್ಯಾಯ ಚ ನಮೋಂ ವನ್ಯಾಯ ಚ ಕಕ್ಷ್ಯಾಯ ಚ ನಮಃ ಶ್ರವಾಯ ಚ ಪ್ರತಿಶ್ರವಾಯ ಚ ನಮೋಂ ಆಶುಷೇಣಾಯ ಚಾಶುರಥಾಯ ಚ ನಮಃ ಶೂರಾಯ ಚಾವಭಿಂದತೆ ಚ ನಮೋಂ ವರ್ಮಿಣೆಯಹ್ಸ್ಚ ವರೂಥಿನೆಯಹ್ಸ್ಚ ನಮೋಂ ಬಿಲ್ಮಿನೆಯಹ್ಸ್ಚ ಕವಿನೆಯಹ್ಸ್ಚ ನಮಃ ಶ್ರುತಾಯ ಚ ಶ್ರುತಸೇನಾಯಹ್ಸ್ಚ ನಮೋಂ ದಂಡುಭ್ಯಾಯ ಚಾಹನನ್ಯಾಯ ಚ ನಮೋಂ ಧೃಷ್ಣವೇಯಹ್ಸ್ಚ ಪ್ರಮೃಶಾಯಹ್ಸ್ಚ ನಮೋಂ ದೂತಾಯ ಚಾಪ್ರಹಿತಾಯ ಚ ನಮೋಂ ನಿಷಂಗಿಣೆಯಹ್ಸ್ಚ ಇಷುಧಿಮತೆಯಹ್ಸ್ಚ ನಮೋಂ ತೀಕ್ಷ್ಣೇಷ್ವೇ ಚಾಯುಧಿನೆಯಹ್ಸ್ಚ ನಮಃ ಸ್ವಾಯುಧಾಯಹ್ಸ್ಚ ಸುಧನ್ವನೆಯಹ್ಸ್ಚ ನಮಃ ಸೃತ್ಯಾಯಹ್ಸ್ಚ ಪಥ್ಯಾಯ ಚ ನಮಃ ಕಾಟ್ಯಾಯ ಚ ನೀಪ್ಯಾಯ ಚ ನಮಃ ಸೂದ್ಯಾಯ ಚ ಸರಸ್ಯಾಯ ಚ ನಮೋಂ ನಾದ್ಯಾಯ ಚ ವೈಶಂತಾಯ ಚ ನಮಃ ಕೂಪ್ಯಾಯ ಚಾವಟ್ಯಾಯ ಚ ನಮೋಂ ವರ್ಷ್ಯಾಯ ಚಾವರ್ಷ್ಯಾಯ ಚ ನಮೋಂ ಮೇಘ್ಯಾಯ ಚ ವಿದ್ಯುತ್ಯಾಯ ಚ ನಮ ಈಧ್ರಿಯಾಯ ಚಾತಪ್ಯಾಯ ಚ ನಮೋಂ ವಾತ್ಯಾಯ ಚ ರೇಷ್ಮಿಯಾಯ ಚ ನಮೋಂ ವಾಸ್ತುಪ್ಯಾಯ ಚ ವಾಸ್ತುಪಾಯ ಚ ನಮೋಂ ಸಹಸ್ತಾಣಿ ಸಹಸ್ಧಾ ಬಾಹುವಸ್ತವ ಹೇತಯಃ ತಾಸಾಮೀಶಾನೋ ಭಗವಃ ಪರಾಚೀರ್ದಶ ದಕ್ಷಿಣಾ ದಶ ಪ್ರತೀಚೀರ್ದಶ-ದಿಚೀರ್ದಶ ಉದ್ಧಸ್ತೆಭ್ಯೋಂ ನಮೋಂತೆ ನಹಿ ಯಶ್ಚ ನೋ ದ್ವೇಷ್ಟಿ ತಂ-ವೋಁ ಜಂಭೆ ದಧಾಮಿ ತೆ ದಿವಸ್ಮಿಷ್ಟೆಭ್ಯೋಂ ನಮೋಂತೆ ನಹಿ ಯಶ್ಚ ನೋ ದ್ವೇಷ್ಟಿ ತಂ-ವೋಁ ಜಂಭೆ ದಧಾಮಿ ಸದಾಶಿವೋಂ ॥ 7 ॥\n\nನಮಃ ಸೋಮಾಯ ಚ ರುದ್ರಾಯ ಚ ನಮೋಸ್ತಾಮ್ರಾಯ ಚಾರುಣಾಯ ಚ ನಮಃ ಶಂಗಾಯ ಚ ಪಶುಪತಯೇ ಚ ನಮೋಂ ಉಗ್ರಾಯ ಚ ಭೀಮಾಯ ಚ ನಮೋಂ ಅಗ್ರೇವಧಾಯ ಚ ದೂರೇವಧಾಯ ಚ ನಮೋಂ ಹಂತ್ರೆ ಚ ಹನೀಯಸೇ ಚ ನಮೋಂ ವೃಕ್ಷೇಭ್ಯೋಂ ಹರಿಕೇಶೇಭ್ಯೋಂ ನಮೋಸ್ತಾರಾಯಂ ನಮಶ್ಶಂಭವೆಯಹ್ಸ್ಚ ಮಯೋಭವೆಯಹ್ಸ್ಚ ನಮಃ ಶಂಕರಾಯಹ್ಸ್ಚ ಮಯಸ್ಕರಾಯಹ್ಸ್ಚ ನಮಃ ಶಿವಾಯಹ್ಸ್ಚ ಶಿವತರಾಯ ಚ ನಮೋಸ್ತೀರ್ಥ್ಯಾಯ ಚ ಕೂಲ್ಯಾಯ ಚ ನಮಃ ಪಾರ್ಯಾಯ ಚಾವಾರ್ಯಾಯ ಚ ನಮಃ ಪ್ರತರಣಾಯ ಚ ಓಟ್ತರಣಾಯ ಚ ನಮೋಂ ಆತಾರ್ಯಾಯ ಚಾಲಾದ್ಯಾಯ ಚ ನಮಃ ಶಷ್ಪ್ಯಾಯ ಚ ಫೇನ್ಯಾಯ ಚ ನಮಃ ಸಿಕ್ಯಾಯ ಚ ಪ್ರವಾಹ್ಯಾಯ ಚ ನಮೋಂ ಇರಿಣ್ಯಾಯ ಚ ಪ್ರಪಥ್ಯಾಯ ಚ ನಮಃ ಕಿಗ್ಂಶಿಲಾಯ ಚ ಕ್ಷಯಣಾಯ ಚ ನಮಃ ಕಪರ್ದಿನೆಯಹ್ಸ್ಚ ಪುಲಸ್ತಯೇ ಚ ನಮೋಂ ಗೋಷ್ಠ್ಯಾಯ ಚ ಗೃಹ್ಯಾಯ ಚ ನಮೋಸ್ತಲ್ಪ್ಯಾಯ ಚ ಗೇಹ್ಯಾಯ ಚ ನಮಃ ಕಾಟ್ಯಾಯ ಚ ಗಹ್ವರೆಷ್ಠಾಯ ಚ ನಮೋಂ ಹ್ರದ್ಯಾಯ ಚ ನಿವೇಷ್ಪ್ಯಾಯ ಚ ನಮಃ ಪಾಗ್ಂ ಸ್ವಯಸ್ಯಾಯ ಚ ರಜಸ್ಯಾಯ ಚ ನಮಃ ಶುಷ್ಕ್ಯಾಯ ಚ ಹರಿತ್ಯಾಯ ಚ ನಮೋಂ ಲೋಪ್ಯಾಯ ಚೋಲಪ್ಯಾಯ ಚ ನಮೋಂ ಊರ್ವ್ಯಾಯ ಚ ಸೂರ್ಮ್ಯಾಯ ಚ ನಮಃ ಪರ್ಣ್ಯಾಯ ಚ ಪರ್ಣಶದ್ಯಾಯ ಚ ನಮೋಂ ಉಪಗುರಮಾಣಾಯ ಚಾಭಿಘ್ನತೆ ಚ ನಮೋಂ ಆಖ್ಖಿದತೆ ಚ ಪ್ರಖ್ಖಿದತೆ ಚ ನಮೋಂ ವಃ ಕಿರಿಕೆಭ್ಯೋಂ ದೇವಾನಾಂ ಹೃದಯೇಭ್ಯೋಂ ನಮೋಂ ವಿಕ್ಷೀಣಕೆಭ್ಯೋಂ ನಮೋಂ ವಿಚಿನ್ವತ್ಕೆಭ್ಯೋಂ ನಮೋಂ ಆನಿರ್ ಹತೆಭ್ಯೋಂ ನಮೋಂ ಆಮೀವತ್ಕೆಭ್ಯಹ್ಸ್ಚ ತೆ ದಿವಸ್ಮಿಷ್ಟೆಭ್ಯೋಂ ನಮೋಂತೆ ನಹಿ ಯಶ್ಚ ನೋ ದ್ವೇಷ್ಟಿ ತಂ-ವೋಁ ಜಂಭೆ ದಧಾಮಿ ಸದಾಶಿವೋಂ ॥ 8 ॥\n\nನಮೋಂ ಬಹವಾಯ ಚ ರುದ್ರಾಯ ಚ ನಮಃ ಶರವಾಯ ಚ ಪಶುಪತಯೇ ಚ ನಮೋಂ ನೀಲಗ್ರೀವಾಯ ಚ ಶಿತಿಕಂಠಾಯ ಚ ನಮಃ ಕಪರ್ದಿನೆಯಹ್ಸ್ಚ ಚ ವ್ಯುಪ್ತಕೇಶಾಯ ಚ ನಮಃ ಸಹಸ್ರಾಕ್ಷಾಯ ಚ ದ ಶತಧನ್ವನೆಯಹ್ಸ್ಚ ನಮೋಂ ಗಿರಿಶಾಯಹ್ಸ್ಚ ಶಿಪಿವಿಷ್ಟಾಯಹ್ಸ್ಚ ನಮೋಂ ಮೀಢುಷ್ಟಮಾಯಹ್ಸ್ಚ ಇಷುಮತೆಯಹ್ಸ್ಚ ನಮೋಂ ಹ್ರಸ್ವಾಯಹ್ಸ್ಚ ವಾಮನಾಯಹ್ಸ್ಚ ನಮೋಂ ಬೃಹತಯೇಯಹ್ಸ್ಚ ವರ್ಷೀಯಸೇಯಹ್ಸ್ಚ ನಮೋಂ ವೃದ್ಧಾಯಹ್ಸ್ಚ ಸಂವೃಧ್ವನೆಯಹ್ಸ್ಚ ನಮೋಂ ಅಗ್ರಿಯಾಯ ಚ ಪ್ರಥಮಾಯಹ್ಸ್ಚ ನಮೋಂ ಆಶವೆಯಹ್ಸ್ಚ ಆಜಿರಾಯಹ್ಸ್ಚ ನಮಃ ಶೀಘ್ರಿಯಾಯಹ್ಸ್ಚ ಶೀಭ್ಯಾಯ ಚ ನಮೋಂ ಊರ್ಮ್ಯಾಯ ಚ ಅವಸ್ವನ್ಯಾಯ ಚ ನಮಃ ಸ್ರೋತಸ್ಯಾಯಹ್ಸ್ಚ ದ್ವೀಪ್ಯಾಯ ಚ ನಮೋಂ ಸಹಸ್ತಾಣಿ ಸಹಸ್ಧಾ ಬಾಹುವಸ್ತವ ಹೇತಯಃ ತಾಸಾಮೀಶಾನೋ ಭಗವಃ ಪರಾಚೀರ್ದಶ ದಕ್ಷಿಣಾ ದಶ ಪ್ರತೀಚೀರ್ದಶ-ದಿಚೀರ್ದಶ ಉದ್ಧಸ್ತೆಭ್ಯೋಂ ನಮೋಂತೆ ನಹಿ ಯಶ್ಚ ನೋ ದ್ವೇಷ್ಟಿ ತಂ-ವೋಁ ಜಂಭೆ ದಧಾಮಿ ತೆ ದಿವಸ್ಮಿಷ್ಟೆಭ್ಯೋಂ ನಮೋಂತೆ ನಹಿ ಯಶ್ಚ ನೋ ದ್ವೇಷ್ಟಿ ತಂ-ವೋಁ ಜಂಭೆ ದಧಾಮಿ ಸದಾಶಿವೋಂ ॥ 9 ॥\n\nದೃಪೆ ಅಂಧಸಸ್ಪತೆ ದರಿದ್ರನ್ನೀಲಲೋಹಿತ ।\nಏಷಾಂ ಪುರುಷಾಣಾಮೇಷಾಂ ಪಶೂಣಾಂ ಮಾ ಭೇರ್ಮಾಽರೋ ಮೋ ಏಷಾಂ ಕಿಂಚನಾಂಮತ್ ।\n\nಯಾ ತೆ ರುದ್ರ ಶಿವಾ ತನೂಃ ಶಿವಾ ವಿಶ್ವಾಹಿಷಜೀ ।\nಶಿವಾ ರುದ್ರಸ್ಯ ಭೇಷಜೀ ತಯಾ ನೋ ಮೃಡ ಜೀವಸೆಽ ॥\n\nಇಮಾಗ್ಂ ರುದ್ರಾಯ ತವಸೆ ಕಪರ್ದಿನೆಽ ಕ್ಷಯದ್ವೀರಾಯ ಪ್ರಭರಾಮಹೆ ಮತಿಮ್ ।\nಯಥಾ ನಶ್ಶಮಸದ್ದ್ವಿಪದೆ ಚತುಷ್ಪದೆ ವಿಶ್ವಂ ಪುಷ್ಟಂ ಗ್ರಾಮೆ ಅಸ್ಮಿನ್ನನಾತುರಮ್ ।\n\nಮೃಡಾ ನೋ ರುದ್ರೋತ ನೋ ಮಯಸ್ಕೃಧಿ ಕ್ಷಯದ್ವೀರಾಯ ನಮಸಾ ವಿಧೇಮ ತೆ ।\nಯಚ್ಛಂ ಚ ಯೋಶ್ಚ ಮನುರಾಯಜೆ ಪಿತಾ ತದಶ್ಯಾಮಂ ತವ ರುದ್ರ ಪ್ರಣೀತೌ ।\n\nಮಾ ನೋ ಮಹಾಂತಮುತ ಮಾ ನೋ ಅರ್ಭಕಂ ಮಾ ನ ಉಕ್ಷಂತಮುತ ಮಾ ನೋ ಉಕ್ಷಿತಮ್ ।\nಮಾ ನೋಽವಧೀಃ ಪಿತರಂ ಮೋತ ಮಾತರಂ ಪ್ರಿಯಾ ಮಾ ನಸ್ತನುವೋ ರುದ್ರ ರೀರಿಷಃ ।\n\nಮಾ ನಸ್ತೋಕೆ ತನಯೆ ಮಾ ನ ಆಯುಷಿ ಮಾ ನೋ ಗೋಷು ಮಾ ನೋ ಅಶ್ವೇಷು ರೀರಿಷಃ ।\nವೀರಾನ್ಮಾ ನೋ ರುದ್ರ ಭಾಮಿತೋಽವಧೀರ್ಹವಿಷ್ಮಂತೋತ ನಮಸಾ ವಿಧೇಮ ತೆ ।\n\nಆರಾತೆ ಗೋಷಣ ಉತ ಪೂರುಷಣ ಕ್ಷಯದ್ವೀರಾಯ ಸುಮ್ನಮಸೆ ತೆ ಅಸ್ತು ।\nರಕ್ಷಾ ಚ ನೋ ಅಧಿ ಚ ದೇವ ಬ್ರೂಹ್ಯಧಾ ಚ ನಃ ಶರ್ಮ್ ಯಚ್ಛ ದ್ವಿಬರ್ಹಾಃ ।\n\nಸ್ತುಹಿ ಶ್ರುತಂ ಗರ್ತಸದಂ-ಯುಂವಾನಂ ಮೃಗನ್ನ ಭೀಮಮುಪಹತ್ನುಮುಗ್ರಮ್ ।\nಮೃಡಾ ಜರಿತ್ರೆ ರುದ್ರ ಸ್ತವಾನೋ ಅನ್ಯಂತೆ ಅಸ್ಮನ್ನಿವಪಂತು ಸೇನಾಃ ।\n\nಪರಿಣೋ ರುದ್ರಸ್ಯ ಹೇತಿರ್ವೃಣಕ್ತು ಪರಿ ತೆಷಸ್ಯ ದರ್ಮತಿ ರಘಾಯೋಃ ।\nಅವ ಸ್ತಿರಾ ಮಘವದ್ಭ್ಯಸ್ತನುಷ್ವ ಮೀಢ್ವಸ್ತೋಕಾಯ ತನಯಾಯ ಮೃಡಯ ।\n\nಮೀಢ್ವಷ್ಟಮ್ ಶಿವತಮ ಶಿವೋ ನಃ ಸುಮನಾ ಭವ ।\nಪರಮೇ ವೃಕ್ಷ ಆಯುಧನ್ನಿಧಾನಿ ಕೃತಿಂ-ವಂಸಾಂ ಆಚರ ಪಿನಾಕಂ ಬಿಭ್ರದಾಗಹಿ ।\n\nವಿಕಿರಿದ್ ವಿಲೋಹಿತ್ ನಮಸ್ತೆ ಅಸ್ತು ಭಗವಃ ।\nಯಾಸ್ತೆ ಸಹಸ್ರಗ್ಂ ಹೇತಯೋಂ ನ್ಯಮಸ್ಮನ್ನಿವಪಂತು ತಾಃ ।\n\nಸಹಸ್ತಾಣಿ ಸಹಸ್ಧಾ ಬಾಹುವಸ್ತವ ಹೇತಯಃ ।\nತಾಸಾಮೀಶಾನೋ ಭಗವಃ ಪರಾಚೀರ್ದಶ ಮುಖಾ ಕೃಧಿ ॥ 10 ॥\n\nಸಹಸ್ತಾಣಿ ಸಹಸ್ರಶೋ ಯೇ ರುದ್ರಾ ಅಧಿಭೂಮ್ಯಾಮ್ ।\nತೆಷಾಗ್ಂ ಸಹಸ್ರಯೋಜನೆಽವಧನ್ವಾನಿ ತನ್ಮಸಿ ।\n\nಅಸ್ಮಿನ್ಮಹತ್ಯರ್ಣೇಽಂತರಿಕ್ಷೆ ಭವಾ ಅಧಿ ।\nನೀಲಗ್ರೀವಾಃ ಶಿತಿಕಂಠಾಃ ಶರ್ವಾ ಅಧಃ, ಕ್ಷಮಾಚರಾಃ ।\n\nನೀಲಗ್ರೀವಾಃ ಶಿತಿಕಂಠಾ ದಿವಗ್ಂ ರುದ್ರಾ ಉಪಶ್ರಿತಾಃ ।\nಯೇ ವೃಕ್ಷೇಷು ಸಸ್ಪಿಂಜರಾ ನೀಲಗ್ರೀವಾ ವಿಲೋಹಿತಾಃ ।\n\nಯೇ ಭೂತಾನಾಮಧಿಪತಯೋ ವಿಶಿಖಾಸಃ ಕಪರ್ದಿನಃ ।\nಯೇ ಅನ್ನೇಷು ವಿವಿಧ್ಯಂತಿ ಪಾತ್ರೆಷು ಪಿಬತೋ ಜನಾನ್ ।\nಮಧು॑ಮತೀಂ ದೇ॒ವೇಭ್ಯೋ॒ ವಾಚ॒ಮುದ್ಯಾಸಗ್ಂಶುಶ್ರೂಷೇ॒ಣ್ಯಾಂ᳚\nಮನು॒ಷ್ಯೇ᳚ಭ್ಯ॒ಸ್ತಂ\nಮಾ॑ ದೇ॒ವಾ ಅ॑ವಂತು ಶೋ॒ಭಾಯೈ॑ ಪಿ॒ತರೋಽನು॑ಮದಂತು ॥\n\nಓಂ ಶಾಂತಿಃ॒ ಶಾಂತಿಃ॒ ಶಾಂತಿಃ॑ ॥</p>" },
      { id: 'rudra-chamaka', kn: 'ರುದ್ರ ಚಮಕಮ್', en: 'Rudra Chamaka', icon: 'menu_book', content: "<p class=\"text-center text-on-surface-variant kannada-text\">ಓಂ ಅಗ್ನಾ॑ವಿಷ್ಣೂ ಸ॒ಜೋಷ॑ಸೇ॒ಮಾವ॑ರ್ಧಂತು ವಾಂ॒ ಗಿರಃ॑ ।\nದ್ಯು॒ಮ್ನೈರ್ವಾಜೇ॑ಭಿ॒ರಾಗ॑ತಮ್ ।\nವಾಜ॑ಶ್ಚ ಮೇ ಪ್ರಸ॒ವಶ್ಚ॑ ಮೇ॒\nಪ್ರಯ॑ತಿಶ್ಚ ಮೇ॒ ಪ್ರಸಿ॑ತಿಶ್ಚ ಮೇ\nಧೀ॒ತಿಶ್ಚ॑ ಮೇ॒ ಕ್ರತು॑ಶ್ಚ ಮೇ॒\nಸ್ವರ॑ಶ್ಚ ಮೇ॒ ಶ್ಲೋಕ॑ಶ್ಚ ಮೇ\nಶ್ರಾ॒ವಶ್ಚ॑ ಮೇ॒ ಶ್ರುತಿ॑ಶ್ಚ ಮೇ॒\nಜ್ಯೋತಿ॑ಶ್ಚ ಮೇ॒ ಸುವ॑ಶ್ಚ ಮೇ\nಪ್ರಾ॒ಣಶ್ಚ॑ ಮೇಽಪಾ॒ನಶ್ಚ॑ ಮೇ\nವ್ಯಾ॒ನಶ್ಚ॒ ಮೇಽಸು॑ಶ್ಚ ಮೇ\nಚಿ॒ತ್ತಂ ಚ॑ ಮ॒ ಆಧೀ॑ತಂ ಚ ಮೇ॒\nವಾಕ್ಚ॑ ಮೇ॒ ಮನ॑ಶ್ಚ ಮೇ॒\nಚಕ್ಷು॑ಶ್ಚ ಮೇ॒ ಶ್ರೋತ್ರಂ॑ ಚ ಮೇ॒\nದಕ್ಷ॑ಶ್ಚ ಮೇ॒ ಬಲಂ॑ ಚ ಮ॒\nಓಜ॑ಶ್ಚ ಮೇ॒ ಸಹ॑ಶ್ಚ ಮ॒\nಆಯು॑ಶ್ಚ ಮೇ ಜ॒ರಾ ಚ॑ ಮ\nಆ॒ತ್ಮಾ ಚ॑ ಮೇ ತ॒ನೂಶ್ಚ॑ ಮೇ॒\nಶರ್ಮ॑ ಚ ಮೇ॒ ವರ್ಮ॑ ಚ॒ ಮೇಽಂಗಾ॑ನಿ ಚ ಮೇ॒ಽಸ್ಥಾನಿ॑ ಚ ಮೇ॒\nಪರೂಗ್ಂ॑ಷಿ ಚ ಮೇ॒ ಶರೀ॑ರಾಣಿ ಚ ಮೇ ॥ 1 ॥</p>" },
      { id: 'purusha-suktha', kn: 'ಪುರುಷ ಸೂಕ್ತ', en: 'Purusha Suktha', icon: 'wb_sunny' },
      { id: 'durga-suktha', kn: 'ದುರ್ಗಾ ಸೂಕ್ತ', en: 'Durga Suktha', icon: 'flare' },
      { id: 'shree-suktha', kn: 'ಶ್ರೀ ಸೂಕ್ತ', en: 'Shree Sukta', icon: 'star' }
    ];

    var FONT_KEY = 'scripture-font-size';
    var readerOverlay = null;
    var listOverlay = null;

    var CSS = [
      '.scripture-overlay{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;background:rgba(36,27,22,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:1rem;animation:scriptureFade .2s ease;}',
      '.scripture-sheet{background:#fffcf8;border:1px solid #eadbd0;border-radius:1.25rem;box-shadow:0 24px 70px rgba(36,27,22,.28);width:100%;max-width:34rem;max-height:min(88vh,50rem);display:flex;flex-direction:column;overflow:hidden;animation:scripturePop .25s cubic-bezier(.2,.9,.3,1.2);}',
      '@keyframes scriptureFade{from{opacity:0}to{opacity:1}}',
      '@keyframes scripturePop{from{opacity:0;transform:scale(.92) translateY(14px)}to{opacity:1;transform:scale(1) translateY(0)}}',
      '.scripture-list-header{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:1.1rem 1.25rem .9rem;border-bottom:1px solid #f0e6dc;background:linear-gradient(135deg,#fff3e6,#fffcf8);}',
      '.scripture-list-body{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:.75rem;display:grid;grid-template-columns:1fr;gap:.6rem;}',
      '@media(min-width:420px){.scripture-list-body{grid-template-columns:1fr 1fr;}}',
      '.scripture-item{display:flex;align-items:center;gap:.8rem;min-height:4rem;padding:.7rem .9rem;border-radius:1rem;background:#fff;border:1.5px solid #eadbd0;text-align:left;cursor:pointer;transition:transform .12s ease,border-color .15s ease,box-shadow .15s ease;-webkit-tap-highlight-color:transparent;width:100%;}',
      '.scripture-item:active{transform:scale(.97);}',
      '.scripture-item:hover{border-color:#ff9933;box-shadow:0 4px 16px rgba(255,153,51,.18);}',
      '.scripture-item-icon{display:flex;align-items:center;justify-content:center;width:2.75rem;height:2.75rem;border-radius:.85rem;background:linear-gradient(135deg,#ffe3c2,#ffd6a6);color:#9a4d00;flex-shrink:0;}',
      '.scripture-item-title{font-weight:700;color:#292524;font-size:1rem;line-height:1.25;}',
      '.scripture-item-sub{font-size:.72rem;color:#8c7a6b;letter-spacing:.03em;}',
      '.scripture-reader-header{display:flex;align-items:center;gap:.5rem;padding:.7rem .8rem;border-bottom:1px solid #f0e6dc;background:linear-gradient(135deg,#fff3e6,#fffcf8);}',
      '.scripture-reader-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:1.1rem 1.25rem 2.5rem;background:#fffdf9;}',
      '.scripture-content{line-height:1.9;color:#292524;}',
      '.scripture-content p{margin-bottom:1rem;}',
      '.scripture-placeholder{text-align:center;color:#8c7a6b;font-style:italic;margin-top:2.5rem;}',
      '.scripture-back-btn,.scripture-font-btn,.scripture-close-btn{display:flex;align-items:center;justify-content:center;height:2.75rem;border-radius:999px;background:#fff3e6;color:#9a4d00;cursor:pointer;border:none;transition:transform .12s ease;-webkit-tap-highlight-color:transparent;}',
      '.scripture-back-btn{padding:0 .9rem;gap:.35rem;font-size:.95rem;}',
      '.scripture-font-btn{width:2.75rem;}',
      '.scripture-close-btn{width:2.75rem;background:#ffe3c2;color:#7c3d00;}',
      '.scripture-back-btn:active,.scripture-font-btn:active,.scripture-close-btn:active{transform:scale(.9);}',
      '.scripture-back{font-size:.72rem;color:#a08c7c;letter-spacing:.05em;}'
    ].join('');

    function injectStyles() {
        var el = document.getElementById('scripture-reader-styles');
        if (!el) {
            el = document.createElement('style');
            el.id = 'scripture-reader-styles';
            el.textContent = CSS;
            document.head.appendChild(el);
        }
    }

    function icon(name, filled) {
        return '<span class="material-symbols-outlined"' + (filled ? ' style="font-variation-settings:\'FILL\' 1;"' : '') + '>' + name + '</span>';
    }

    function closeReader() { if (readerOverlay) { readerOverlay.remove(); readerOverlay = null; } }
    function closeAll() { closeReader(); if (listOverlay) { listOverlay.remove(); listOverlay = null; } }
    function escHandler() { closeAll(); }



    function openScriptures() {
        injectStyles();
        if (listOverlay && document.body.contains(listOverlay)) return;
        listOverlay = document.createElement('div');
        listOverlay.className = 'scripture-overlay';
        var items = '';
        SCRIPTURES.forEach(function (s, i) {
            items +=
              '<button class="scripture-item" data-scripture-id="' + s.id + '" aria-label="' + s.en + '">' +
                '<span class="scripture-item-icon">' + icon(s.icon, true) + '</span>' +
                '<span style="min-width:0;">' +
                  '<span class="scripture-item-title kannada-text" style="display:block;">' + s.kn + '</span>' +
                  '<span class="scripture-item-sub">' + (i + 1) + ' · ' + s.en + '</span>' +
                '</span>' +
              '</button>';
        });
        listOverlay.innerHTML =
          '<div class="scripture-sheet" role="dialog" aria-label="Sacred Scriptures">' +
            '<div class="scripture-list-header">' +
              '<div style="display:flex;align-items:center;gap:.6rem;min-width:0;">' +
                '<span class="scripture-item-icon" style="width:3rem;height:3rem;background:linear-gradient(135deg,#ffd6a6,#ff9933);color:#fff;">' + icon('auto_stories', true) + '</span>' +
                '<div style="min-width:0;">' +
                  '<h3 class="kannada-text font-bold text-stone-900" style="font-size:1.15rem;margin:0;">ಪವಿತ್ರ ಗ್ರಂಥಗಳು</h3>' +
                  '<p class="scripture-back" style="margin:0;">SACRED SCRIPTURES</p>' +
                '</div>' +
              '</div>' +
              '<button class="scripture-close-btn" data-scripture-close aria-label="Close">' + icon('close') + '</button>' +
            '</div>' +
            '<div class="scripture-list-body">' + items + '</div>' +
          '</div>';
        document.body.appendChild(listOverlay);
        listOverlay.addEventListener('click', function (e) {
            if (e.target === listOverlay || e.target.closest('[data-scripture-close]')) { closeAll(); return; }
            var item = e.target.closest('[data-scripture-id]');
            if (item) openReader(item.getAttribute('data-scripture-id'));
        });
        document.addEventListener('keydown', escHandler);
    }

    function openReader(id) {
        injectStyles();
        var s = null;
        for (var i = 0; i < SCRIPTURES.length; i++) { if (SCRIPTURES[i].id === id) { s = SCRIPTURES[i]; break; } }
        if (!s) return;
        closeReader();
        var fontSize = parseInt(localStorage.getItem(FONT_KEY), 10);
        if (isNaN(fontSize)) fontSize = 18;
        fontSize = Math.min(Math.max(fontSize, 12), 34);
        readerOverlay = document.createElement('div');
        readerOverlay.className = 'scripture-overlay';
        readerOverlay.innerHTML =
          '<div class="scripture-sheet" role="dialog" aria-label="' + s.en + '">' +
            '<div class="scripture-reader-header">' +
              '<button class="scripture-back-btn" data-scripture-back aria-label="Back to scriptures list">' + icon('arrow_back') + '<span class="kannada-text font-bold">ಹಿಂದೆ</span></button>' +
              '<div style="flex:1;text-align:center;min-width:0;">' +
                '<h3 class="kannada-text font-bold text-stone-900" style="font-size:1.05rem;line-height:1.25;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + s.kn + '</h3>' +
                '<p class="scripture-back" style="margin:0;">' + s.en + '</p>' +
              '</div>' +
              '<button class="scripture-font-btn" data-scripture-font="dec" aria-label="Decrease font size">' + icon('remove') + '</button>' +
              '<button class="scripture-font-btn" data-scripture-font="inc" aria-label="Increase font size">' + icon('add') + '</button>' +
              '<button class="scripture-close-btn" data-scripture-close aria-label="Close">' + icon('close') + '</button>' +
            '</div>' +
            '<div class="scripture-reader-body"><div class="scripture-content kannada-text" style="font-size:' + fontSize + 'px;">' + (s.content || PLACEHOLDER) + '</div></div>' +
          '</div>';
        document.body.appendChild(readerOverlay);

        readerOverlay.addEventListener('click', function (e) {
            if (e.target === readerOverlay || e.target.closest('[data-scripture-close]')) { closeAll(); return; }
            if (e.target.closest('[data-scripture-back]')) {
                closeReader();
                if (!listOverlay || !document.body.contains(listOverlay)) openScriptures();
                return;
            }
            var fontBtn = e.target.closest('[data-scripture-font]');
            if (fontBtn) {
                fontSize = fontBtn.getAttribute('data-scripture-font') === 'inc' ? Math.min(fontSize + 2, 34) : Math.max(fontSize - 2, 12);
                readerOverlay.querySelector('.scripture-content').style.fontSize = fontSize + 'px';
                localStorage.setItem(FONT_KEY, String(fontSize));
            }
        });
    }

    window.openScriptures = openScriptures;
})();

