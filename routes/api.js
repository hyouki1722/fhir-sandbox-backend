const express = require('express');
const router = express.Router();
const multer = require('multer');
const fhirController = require('../controllers/fhirController');

// 設定 Multer，限制檔案大小為 3MB 以下 (3 * 1024 * 1024 bytes)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允許上傳圖片檔案！'), false);
        }
    }
});

// 封裝上傳攔截器，精確處理檔案過大等錯誤
const mediaUploadMiddleware = (req, res, next) => {
    upload.single('image')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: '上傳檔案的大小須為3MB以下' });
            }
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};

router.post('/organization', fhirController.createOrganization);
router.post('/location', fhirController.createLocation);
router.post('/patient', fhirController.createPatient);
router.post('/observation', fhirController.createObservation);
router.post('/media', mediaUploadMiddleware, fhirController.createMedia);
router.get('/search/:resourceType', fhirController.searchResource);

// 💡 修正：確保 bundle 路由放在匯出之前
router.post('/bundle', fhirController.createTransactionBundle);

module.exports = router;