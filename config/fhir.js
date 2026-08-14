require('dotenv').config();

// 💡 終極防護：確保 URL 絕對合法
let safeFhirUrl = 'https://hapi.fhir.org/baseR4'; // 最安全的預設網址

try {
    const rawUrl = process.env.FHIR_BASE_URL;
    if (rawUrl) {
        // 清理多餘的單雙引號與前後空白
        const cleaned = rawUrl.replace(/['"]/g, '').trim();
        // 嘗試用 Node 的 URL 物件強制解析，若格式不對(如漏掉 https://)會直接報錯跳到 catch
        new URL(cleaned); 
        safeFhirUrl = cleaned;
    }
} catch (error) {
    console.error('⚠️ 環境變數 FHIR_BASE_URL 格式異常，已強制切換為預設網址！');
}

module.exports = {
    FHIR_BASE_URL: safeFhirUrl,
    PORT: process.env.PORT || 3000,
    PROFILES: {
        ORGANIZATION: "https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Organization-twcore",
        LOCATION: "https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Location-twcore",
        PATIENT: "https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Patient-twcore",
        OBSERVATION_VITAL: "https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Observation-vitalSigns-twcore"
    }
};