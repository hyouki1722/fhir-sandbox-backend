// 💡 關鍵修正：在程式最頂端載入環境變數，確保後續所有模組都能讀取到 process.env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const { PORT, FHIR_BASE_URL } = require('./config/fhir');

const app = express();
app.use(cors());
app.use(express.json());

// 簡易日誌中介軟體
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// 掛載 API 路由
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`
    ===================================================
    🚀 FHIR Interoperability Sandbox Server is Online
    ===================================================
    - Port: ${PORT}
    - Target Server: ${FHIR_BASE_URL}
    - Architecture: MVC Pattern Enabled
    - Security: Dotenv Loaded
    ===================================================
    等待前端請求...
    `);
});