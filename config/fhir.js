require('dotenv').config();

// 💡 企業級防護：自動清除環境變數中可能誤夾帶的空白字元與引號
const rawUrl = process.env.FHIR_BASE_URL || 'https://hapi.fhir.org/baseR4';
const cleanUrl = rawUrl.replace(/['"]/g, '').trim();

module.exports = {
    FHIR_BASE_URL: cleanUrl,
    PORT: process.env.PORT || 3000,
    PROFILES: {
        ORGANIZATION: "https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Organization-twcore",
        LOCATION: "https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Location-twcore",
        PATIENT: "https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Patient-twcore",
        OBSERVATION_VITAL: "https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Observation-vitalSigns-twcore"
    }
};