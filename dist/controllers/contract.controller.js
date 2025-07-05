"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContractByID = exports.getUserContracts = exports.analyzeContract = exports.detectAndConfirmContractType = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const redis_1 = __importDefault(require("../config/redis"));
const ai_services_1 = require("../services/ai.services");
const contract_model_1 = __importDefault(require("../models/contract.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongoUtils_1 = require("../utils/mongoUtils");
// Configure multer for PDF uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        }
        else {
            cb(null, false);
        }
    },
}).single("contract");
exports.uploadMiddleware = upload;
const detectAndConfirmContractType = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user; // Type assertion for safety
    if (!req.file) {
        res.status(400).json({ error: "No file uploaded or invalid file type" });
        return;
    }
    if (!user || !user._id) {
        res.status(401).json({ error: "User not authenticated" });
        return;
    }
    let fileKey;
    try {
        fileKey = `file:${user._id.toString()}:${Date.now()}`;
        yield redis_1.default.set(fileKey, req.file.buffer);
        yield redis_1.default.expire(fileKey, 3600);
        const pdfText = yield (0, ai_services_1.extractTextFromPDF)(fileKey);
        const detectedType = yield (0, ai_services_1.detectContractType)(pdfText);
        res.json({ detectedType });
    }
    catch (error) {
        console.error("Error detecting contract type:", error.message, error.stack);
        res.status(500).json({
            error: "Failed to detect contract type",
            details: error.message,
        });
    }
    finally {
        if (fileKey) {
            yield redis_1.default.del(fileKey);
        }
    }
});
exports.detectAndConfirmContractType = detectAndConfirmContractType;
const analyzeContract = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = req.user;
    const { contractType } = req.body;
    if (!req.file) {
        res.status(400).json({ error: "No file uploaded or invalid file type" });
        return;
    }
    if (!contractType || typeof contractType !== "string") {
        res.status(400).json({ error: "Valid contract type is required" });
        return;
    }
    if (!user || !user._id) {
        res.status(401).json({ error: "User not authenticated" });
        return;
    }
    let fileKey;
    try {
        fileKey = `file:${user._id.toString()}:${Date.now()}`;
        yield redis_1.default.set(fileKey, req.file.buffer, { ex: 3600 });
        const pdfText = yield (0, ai_services_1.extractTextFromPDF)(fileKey);
        const tier = user.isPremium ? "premium" : "free";
        const analysisResult = yield (0, ai_services_1.analyzeContractWithAI)(pdfText, contractType, user._id.toString(), tier);
        const analysis = new contract_model_1.default({
            userId: new mongoose_1.default.Types.ObjectId(user._id.toString()),
            contractText: analysisResult.contractText || pdfText,
            contractType: analysisResult.contractType || contractType,
            risks: analysisResult.risks || [],
            opportunities: analysisResult.opportunities || [],
            summary: analysisResult.summary || "No summary provided",
            recommendations: analysisResult.recommendations || [],
            keyClauses: analysisResult.keyClauses || [],
            legalCompliance: analysisResult.legalCompliance || [],
            negotiationPoints: analysisResult.negotiationPoints || [],
            contractDuration: analysisResult.contractDuration || "Not specified",
            terminationConditions: analysisResult.terminationConditions || "Not specified",
            overallScore: (_a = analysisResult.overallScore) !== null && _a !== void 0 ? _a : 0,
            compensationStructure: analysisResult.compensationStructure || {
                baseSalary: "Not specified",
                bonuses: "Not specified",
                equity: "Not specified",
                otherBenefits: "Not specified",
            },
            performanceMetrics: analysisResult.performanceMetrics || [],
            intellectualPropertyClauses: Array.isArray(analysisResult.intellectualPropertyClauses)
                ? analysisResult.intellectualPropertyClauses
                : analysisResult.intellectualPropertyClauses
                    ? [analysisResult.intellectualPropertyClauses]
                    : [],
            createdAt: analysisResult.createdAt || new Date(),
            version: analysisResult.version || 1,
            userFeedback: analysisResult.userFeedback || { rating: 0, comments: "" },
            customFields: analysisResult.customFields || {},
            expirationDate: analysisResult.expirationDate ||
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            language: analysisResult.language || "en",
            aiModel: analysisResult.aiModel || "gemini-1.5-flash",
            financialTerms: analysisResult.financialTerms || {
                description: "Not specified",
                details: [],
            },
        });
        if (!analysis.contractText || !analysis.contractType || !analysis.summary) {
            throw new Error("Invalid analysis result: missing required fields");
        }
        const savedAnalysis = yield analysis.save();
        res.json(savedAnalysis);
    }
    catch (error) {
        console.error("Error analyzing contract:", error.message, error.stack);
        res
            .status(500)
            .json({ error: "Failed to analyze contract", details: error.message });
    }
    finally {
        if (fileKey) {
            try {
                yield redis_1.default.del(fileKey);
            }
            catch (redisError) {
                console.error("Error deleting Redis key:", redisError);
            }
        }
    }
});
exports.analyzeContract = analyzeContract;
const getUserContracts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    if (!user || !user._id) {
        res.status(401).json({ error: "User not authenticated" });
        return;
    }
    try {
        const query = { userId: user._id };
        const contracts = yield contract_model_1.default.find(query).sort({
            createdAt: -1,
        });
        res.json(contracts);
    }
    catch (error) {
        console.error("Error fetching contracts:", error.message, error.stack);
        res
            .status(500)
            .json({ error: "Failed to get contracts", details: error.message });
    }
});
exports.getUserContracts = getUserContracts;
const getContractByID = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const user = req.user;
    if (!user || !user._id) {
        res.status(401).json({ error: "User not authenticated" });
        return;
    }
    if (!(0, mongoUtils_1.isValidMongoId)(id)) {
        res.status(400).json({ error: "Invalid Contract ID" });
        return;
    }
    try {
        const cachedContract = yield redis_1.default.get(`contract:${id}`);
        if (cachedContract && typeof cachedContract === "string") {
            res.json(JSON.parse(cachedContract));
            return;
        }
        const contract = yield contract_model_1.default.findOne({
            _id: id,
            userId: user._id,
        }).lean();
        if (!contract) {
            res.status(404).json({ error: "Contract not found" });
            return;
        }
        yield redis_1.default.set(`contract:${id}`, JSON.stringify(contract), { ex: 3600 });
        res.json(contract);
    }
    catch (error) {
        console.error("Error fetching contract:", error.message, error.stack);
        res
            .status(500)
            .json({ error: "Failed to get contract", details: error.message });
    }
});
exports.getContractByID = getContractByID;
