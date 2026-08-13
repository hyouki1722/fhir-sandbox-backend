const axios = require('axios');
const { FHIR_BASE_URL } = require('../config/fhir');

async function postResource(resourceType, data) {
    try {
        const response = await axios.post(`${FHIR_BASE_URL}/${resourceType}`, data, {
            headers: { 'Content-Type': 'application/fhir+json' }
        });
        return {
            status: response.status,
            id: response.data.id, // 這次拿到的將會是真正的資源 ID
            data: response.data
        };
    } catch (error) {
        throw {
            status: error.response?.status || 500,
            message: error.response?.data?.diagnostics || error.message,
            outcome: error.response?.data || null
        };
    }
}

async function searchResource(resourceType, queryString) {
    try {
        const response = await axios.get(`${FHIR_BASE_URL}/${resourceType}?${queryString}`);
        return {
            status: response.status,
            total: response.data.total,
            entry: response.data.entry || []
        };
    } catch (error) {
        throw {
            status: error.response?.status || 500,
            message: error.message,
            outcome: error.response?.data || null
        };
    }
}

async function postTransaction(bundleData) {
    try {
        // 直接發送至 baseR4 根目錄，不加任何斜線
        const response = await axios.post(FHIR_BASE_URL, bundleData, {
            headers: { 'Content-Type': 'application/fhir+json' }
        });
        return {
            status: response.status,
            data: response.data
        };
    } catch (error) {
        throw {
            status: error.response?.status || 500,
            message: error.response?.data?.diagnostics || error.message,
            outcome: error.response?.data || null
        };
    }
}

module.exports = { postResource, searchResource, postTransaction };