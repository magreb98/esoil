import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';

// v1 : français uniquement (confirmé, §2). Toutes les chaînes passent par i18n pour ajouter
// l'anglais plus tard sans refonte. Aucune ressource distante — tout est bundlé (mode hors ligne).
void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr } },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export default i18n;
