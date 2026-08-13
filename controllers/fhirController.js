const fhirService = require('../services/fhirService');
const { PROFILES } = require('../config/fhir');
const crypto = require('crypto');
const { z } = require('zod'); // 💡 引入 Zod 進行防護

// 安全的 UUID 產生器
const generateUUID = () => {
    if (crypto && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// 💡 建立企業級資料驗證 Schema (防範異常數值寫入)
const bodyFatSchema = z.object({
    bodyFatValue: z.coerce.number()
        .min(1, "體脂率不可能低於 1%")
        .max(100, "體脂率不可能高於 100%")
});

exports.createOrganization = async (req, res) => {
    const { identifierSystem, identifierValue, active, typeCode, typeDisplay, name, alias, telecomPhone, telecomEmail, address } = req.body;
    
    const fhirData = {
        resourceType: "Organization",
        meta: { profile: [PROFILES.ORGANIZATION] },
        active: active,
        name: name
    };
    
    if (identifierSystem && identifierValue) fhirData.identifier = [{ system: identifierSystem, value: identifierValue }];
    if (typeCode && typeDisplay) fhirData.type = [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/organization-type", code: typeCode, display: typeDisplay }] }];
    if (alias) fhirData.alias = alias.split(',').map(a => a.trim()).filter(a => a.length > 0);
    
    if (telecomPhone || telecomEmail) {
        fhirData.telecom = [];
        if (telecomPhone) fhirData.telecom.push({ system: "phone", value: telecomPhone });
        if (telecomEmail) fhirData.telecom.push({ system: "email", value: telecomEmail });
    }
    if (address) fhirData.address = [{ text: address }];

    try {
        const result = await fhirService.postResource("Organization", fhirData);
        res.status(result.status).json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message, details: err.outcome });
    }
};

exports.createLocation = async (req, res) => {
    const data = req.body;
    const fhirData = {
        resourceType: "Location",
        meta: { profile: [PROFILES.LOCATION] },
        status: data.status,
        name: data.name,
        description: data.description,
        mode: data.mode,
        managingOrganization: { reference: `Organization/${data.orgId}` }
    };
    
    if (data.typeCode) fhirData.type = [{ coding: [{ code: data.typeCode, display: data.typeDisplay }] }];
    if (data.telecomValue) fhirData.telecom = [{ system: data.telecomSystem, value: data.telecomValue }];
    if (data.address) fhirData.address = { text: data.address };
    if (data.physicalTypeCode) fhirData.physicalType = { coding: [{ code: data.physicalTypeCode, display: data.physicalTypeDisplay }] };

    try {
        const result = await fhirService.postResource("Location", fhirData);
        res.status(result.status).json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message, details: err.outcome });
    }
};

exports.createPatient = async (req, res) => {
    const data = req.body;
    const fhirData = {
        resourceType: "Patient",
        meta: { profile: [PROFILES.PATIENT] },
        active: data.active,
        identifier: [],
        name: [{ text: data.nameText, family: data.nameFamily, given: [data.nameGiven] }],
        gender: data.gender,
        birthDate: data.birthDate,
        managingOrganization: { reference: `Organization/${data.orgId}` }
    };

    if (data.identifierId) fhirData.identifier.push({ system: "http://www.moi.gov.tw", value: data.identifierId });
    if (data.identifierMrn) fhirData.identifier.push({ system: "http://hghh.example.tw/mrn", value: data.identifierMrn });
    if (data.telecomValue) fhirData.telecom = [{ system: data.telecomSystem, use: data.telecomUse, value: data.telecomValue }];
    if (data.address) fhirData.address = [{ text: data.address }];

    try {
        const result = await fhirService.postResource("Patient", fhirData);
        res.status(result.status).json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message, details: err.outcome });
    }
};

exports.createObservation = async (req, res) => {
    try {
        const data = req.body;

        // 💡 執行 Zod 驗證：確保體脂率數值合法
        const validatedData = bodyFatSchema.parse({ bodyFatValue: data.bodyFatValue });

        const fhirData = {
            resourceType: "Observation",
            meta: { profile: [PROFILES.OBSERVATION_VITAL] },
            status: "final",
            category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs", display: "Vital Signs" }] }],
            code: { coding: [{ system: "http://loinc.org", code: "41982-0", display: "Percentage of body fat Measured" }] },
            subject: { reference: `Patient/${data.patientId}` },
            effectiveDateTime: new Date().toISOString(),
            valueQuantity: { value: validatedData.bodyFatValue, unit: "%", system: "http://unitsofmeasure.org", code: "%" },
            device: { display: "輝葉良品智能體脂計" }
        };
        
        const result = await fhirService.postResource("Observation", fhirData);
        res.status(result.status).json(result);
    } catch (err) {
        // 若 Zod 驗證失敗，會在此被捕捉並回傳 400 Bad Request
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: "數據格式錯誤", details: err.errors });
        }
        res.status(err.status || 500).json({ error: err.message, details: err.outcome });
    }
};

exports.searchResource = async (req, res) => {
    try {
        const queryString = new URLSearchParams(req.query).toString();
        const result = await fhirService.searchResource(req.params.resourceType, queryString);
        res.json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message, details: err.outcome });
    }
};

exports.createMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "請提供影像檔案" });
        }

        const data = req.body;
        const base64Data = req.file.buffer.toString('base64');

        const fhirData = {
            resourceType: "Media",
            status: "completed",
            type: {
                coding: [{ 
                    system: "http://terminology.hl7.org/CodeSystem/media-type", 
                    code: "image", 
                    display: "Image" 
                }]
            },
            subject: { 
                reference: `Patient/${data.patientId}` 
            },
            content: {
                contentType: req.file.mimetype,
                data: base64Data,
                title: data.title || "長照傷口/紀錄影像"
            },
            bodySite: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: "39937001",
                    display: "Skin structure"
                }]
            }
        };

        const result = await fhirService.postResource("Media", fhirData);
        res.status(result.status).json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message, details: err.outcome });
    }
};

exports.createTransactionBundle = async (req, res) => {
    try {
        const { org, loc, patient, obs } = req.body;

        // 💡 同樣在 Bundle 寫入前執行 Zod 驗證
        const validatedObs = bodyFatSchema.parse({ bodyFatValue: obs.bodyFatValue });

        const orgUrn = `urn:uuid:${generateUUID()}`;
        const locUrn = `urn:uuid:${generateUUID()}`;
        const patientUrn = `urn:uuid:${generateUUID()}`;
        const obsUrn = `urn:uuid:${generateUUID()}`;

        const bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: []
        };

        // 1. 打包 Organization
        const orgResource = {
            resourceType: "Organization",
            meta: { profile: [PROFILES.ORGANIZATION] },
            active: org.active,
            name: org.name,
            identifier: []
        };
        if (org.identifierValue) orgResource.identifier.push({ system: org.identifierSystem || "http://nhi.gov.tw", value: org.identifierValue });
        if (org.typeCode && org.typeDisplay) orgResource.type = [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/organization-type", code: org.typeCode, display: org.typeDisplay }] }];
        if (org.alias) orgResource.alias = org.alias.split(',').map(a => a.trim()).filter(a => a.length > 0);
        if (org.telecomPhone || org.telecomEmail) {
            orgResource.telecom = [];
            if (org.telecomPhone) orgResource.telecom.push({ system: "phone", value: org.telecomPhone });
            if (org.telecomEmail) orgResource.telecom.push({ system: "email", value: org.telecomEmail });
        }
        if (org.address) orgResource.address = [{ text: org.address }];

        bundle.entry.push({
            fullUrl: orgUrn,
            resource: orgResource,
            request: { method: "POST", url: "Organization" }
        });

        // 2. 打包 Location
        const locResource = {
            resourceType: "Location",
            meta: { profile: [PROFILES.LOCATION] },
            status: loc.status,
            name: loc.name,
            description: loc.description,
            mode: loc.mode,
            managingOrganization: { reference: orgUrn } 
        };
        if (loc.typeCode) locResource.type = [{ coding: [{ code: loc.typeCode, display: loc.typeDisplay }] }];
        if (loc.telecomValue) locResource.telecom = [{ system: loc.telecomSystem, value: loc.telecomValue }];
        if (loc.address) locResource.address = { text: loc.address };
        if (loc.physicalTypeCode) locResource.physicalType = { coding: [{ code: loc.physicalTypeCode, display: loc.physicalTypeDisplay }] };

        bundle.entry.push({
            fullUrl: locUrn,
            resource: locResource,
            request: { method: "POST", url: "Location" }
        });

        // 3. 打包 Patient
        const patResource = {
            resourceType: "Patient",
            meta: { profile: [PROFILES.PATIENT] },
            active: patient.active,
            identifier: [],
            name: [{ text: patient.nameText, family: patient.nameFamily, given: [patient.nameGiven] }],
            gender: patient.gender,
            birthDate: patient.birthDate,
            managingOrganization: { reference: orgUrn }
        };
        if (patient.identifierId) patResource.identifier.push({ system: "http://www.moi.gov.tw", value: patient.identifierId });
        if (patient.identifierMrn) patResource.identifier.push({ system: "http://hghh.example.tw/mrn", value: patient.identifierMrn });
        if (patient.telecomValue) patResource.telecom = [{ system: patient.telecomSystem, use: patient.telecomUse, value: patient.telecomValue }];
        if (patient.address) patResource.address = [{ text: patient.address }];

        bundle.entry.push({
            fullUrl: patientUrn,
            resource: patResource,
            request: { method: "POST", url: "Patient" }
        });

        // 4. 打包 Observation (使用已驗證的數值)
        bundle.entry.push({
            fullUrl: obsUrn,
            resource: {
                resourceType: "Observation",
                meta: { profile: [PROFILES.OBSERVATION_VITAL] },
                status: "final",
                category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs", display: "Vital Signs" }] }],
                code: { coding: [{ system: "http://loinc.org", code: "41982-0", display: "Percentage of body fat Measured" }] },
                subject: { reference: patientUrn },
                effectiveDateTime: new Date().toISOString(),
                valueQuantity: { value: validatedObs.bodyFatValue, unit: "%", system: "http://unitsofmeasure.org", code: "%" },
                device: { display: "輝葉良品智能體脂計" }
            },
            request: { method: "POST", url: "Observation" }
        });

        const result = await fhirService.postTransaction(bundle);
        res.status(200).json(result);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: "數據打包格式錯誤", details: err.errors });
        }
        res.status(err.status || 500).json({ error: err.message, details: err.outcome });
    }
};