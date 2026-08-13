// 確保優先讀取 .env 檔案
require('dotenv').config();

module.exports = {
    // 改為動態讀取環境變數，若無則給予預設值
    FHIR_BASE_URL: process.env.FHIR_BASE_URL || 'https://hapi.fhir.org/baseR4',
    PORT: process.env.PORT || 3000,
    PROFILES: {
        ORGANIZATION: "https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Organization-twcore",
        LOCATION: "https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Location-twcore",
        PATIENT: "https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Patient-twcore",
        OBSERVATION_VITAL: "https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Observation-vitalSigns-twcore"
    }
};