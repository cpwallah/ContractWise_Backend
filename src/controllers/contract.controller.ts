// import { Request, Response } from "express";
// import multer from "multer";
// import { IUser } from "../models/user.model";
// import redis from "../config/redis";
// import {
//   analyzeContractWithAI,
//   detectContractType,
//   extractTextFromPDF,
//   ContractAnalysis,
// } from "../services/ai.services";
// import ContractAnalysisSchema, {
//   IContractAnalysis,
// } from "../models/contract.model";
// import mongoose, { FilterQuery } from "mongoose";
// import { isValidMongoId } from "../utils/mongoUtils";

// // Configure multer for PDF uploads
// const upload = multer({
//   storage: multer.memoryStorage(),
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype === "application/pdf") {
//       cb(null, true);
//     } else {
//       cb(null, false);
//     }
//   },
// }).single("contract");

// export const uploadMiddleware = upload;

// export const detectAndConfirmContractType = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   const user = req.user as IUser | undefined; // Type assertion for safety
//   if (!req.file) {
//     res.status(400).json({ error: "No file uploaded or invalid file type" });
//     return;
//   }

//   if (!user || !user._id) {
//     res.status(401).json({ error: "User not authenticated" });
//     return;
//   }

//   let fileKey: string | undefined;
//   try {
//     fileKey = `file:${user._id.toString()}:${Date.now()}`;
//     await redis.set(fileKey, req.file.buffer);
//     await redis.expire(fileKey, 3600);

//     const pdfText = await extractTextFromPDF(fileKey);
//     const detectedType = await detectContractType(pdfText);

//     res.json({ detectedType });
//   } catch (error: any) {
//     console.error("Error detecting contract type:", error.message, error.stack);
//     res.status(500).json({
//       error: "Failed to detect contract type",
//       details: error.message,
//     });
//   } finally {
//     if (fileKey) {
//       await redis.del(fileKey);
//     }
//   }
// };

// export const analyzeContract = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   const user = req.user as IUser | undefined;
//   const { contractType } = req.body;

//   if (!req.file) {
//     res.status(400).json({ error: "No file uploaded or invalid file type" });
//     return;
//   }
//   if (!contractType || typeof contractType !== "string") {
//     res.status(400).json({ error: "Valid contract type is required" });
//     return;
//   }
//   if (!user || !user._id) {
//     res.status(401).json({ error: "User not authenticated" });
//     return;
//   }

//   let fileKey: string | undefined;
//   try {
//     fileKey = `file:${user._id.toString()}:${Date.now()}`;
//     await redis.set(fileKey, req.file.buffer, { ex: 3600 });

//     const pdfText = await extractTextFromPDF(fileKey);
//     const tier: "free" | "premium" = user.isPremium ? "premium" : "free";
//     const analysisResult: ContractAnalysis = await analyzeContractWithAI(
//       pdfText,
//       contractType,
//       user._id.toString(),
//       tier
//     );

//     const analysis = new ContractAnalysisSchema({
//       userId: new mongoose.Types.ObjectId(user._id.toString()),
//       contractText: analysisResult.contractText || pdfText,
//       contractType: analysisResult.contractType || contractType,
//       risks: analysisResult.risks || [],
//       opportunities: analysisResult.opportunities || [],
//       summary: analysisResult.summary || "No summary provided",
//       recommendations: analysisResult.recommendations || [],
//       keyClauses: analysisResult.keyClauses || [],
//       legalCompliance: analysisResult.legalCompliance || [],
//       negotiationPoints: analysisResult.negotiationPoints || [],
//       contractDuration: analysisResult.contractDuration || "Not specified",
//       terminationConditions:
//         analysisResult.terminationConditions || "Not specified",
//       overallScore: analysisResult.overallScore ?? 0,
//       compensationStructure: analysisResult.compensationStructure || {
//         baseSalary: "Not specified",
//         bonuses: "Not specified",
//         equity: "Not specified",
//         otherBenefits: "Not specified",
//       },
//       performanceMetrics: analysisResult.performanceMetrics || [],
//       intellectualPropertyClauses: Array.isArray(
//         analysisResult.intellectualPropertyClauses
//       )
//         ? analysisResult.intellectualPropertyClauses
//         : analysisResult.intellectualPropertyClauses
//         ? [analysisResult.intellectualPropertyClauses]
//         : [],
//       createdAt: analysisResult.createdAt || new Date(),
//       version: analysisResult.version || 1,
//       userFeedback: analysisResult.userFeedback || { rating: 0, comments: "" },
//       customFields: analysisResult.customFields || {},
//       expirationDate:
//         analysisResult.expirationDate ||
//         new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
//       language: analysisResult.language || "en",
//       aiModel: analysisResult.aiModel || "gemini-1.5-flash",
//       financialTerms: analysisResult.financialTerms || {
//         description: "Not specified",
//         details: [],
//       },
//     }) as IContractAnalysis;

//     if (!analysis.contractText || !analysis.contractType || !analysis.summary) {
//       throw new Error("Invalid analysis result: missing required fields");
//     }

//     const savedAnalysis = await analysis.save();
//     res.json(savedAnalysis);
//   } catch (error: any) {
//     console.error("Error analyzing contract:", error.message, error.stack);
//     res
//       .status(500)
//       .json({ error: "Failed to analyze contract", details: error.message });
//   } finally {
//     if (fileKey) {
//       try {
//         await redis.del(fileKey);
//       } catch (redisError) {
//         console.error("Error deleting Redis key:", redisError);
//       }
//     }
//   }
// };

// export const getUserContracts = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   const user = req.user as IUser | undefined;
//   if (!user || !user._id) {
//     res.status(401).json({ error: "User not authenticated" });
//     return;
//   }

//   try {
//     const query: FilterQuery<IContractAnalysis> = { userId: user._id };
//     const contracts = await ContractAnalysisSchema.find(query).sort({
//       createdAt: -1,
//     });
//     res.json(contracts);
//   } catch (error: any) {
//     console.error("Error fetching contracts:", error.message, error.stack);
//     res
//       .status(500)
//       .json({ error: "Failed to get contracts", details: error.message });
//   }
// };

// export const getContractByID = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   const { id } = req.params;
//   const user = req.user as IUser | undefined;

//   if (!user || !user._id) {
//     res.status(401).json({ error: "User not authenticated" });
//     return;
//   }

//   if (!isValidMongoId(id)) {
//     res.status(400).json({ error: "Invalid Contract ID" });
//     return;
//   }

//   try {
//     const cachedContract = await redis.get(`contract:${id}`);
//     if (cachedContract && typeof cachedContract === "string") {
//       res.json(JSON.parse(cachedContract));
//       return;
//     }

//     const contract = await ContractAnalysisSchema.findOne({
//       _id: id,
//       userId: user._id,
//     }).lean();

//     if (!contract) {
//       res.status(404).json({ error: "Contract not found" });
//       return;
//     }

//     await redis.set(`contract:${id}`, JSON.stringify(contract), { ex: 3600 });
//     res.json(contract);
//   } catch (error: any) {
//     console.error("Error fetching contract:", error.message, error.stack);
//     res
//       .status(500)
//       .json({ error: "Failed to get contract", details: error.message });
//   }
// };

import { Request, Response } from "express";
import multer from "multer";
import { IUser } from "../models/user.model";
import redis from "../config/redis";
import {
  analyzeContractWithAI,
  detectContractType,
  extractTextFromPDF,
  ContractAnalysis,
} from "../services/ai.services";
import ContractAnalysisSchema, {
  IContractAnalysis,
} from "../models/contract.model";
import mongoose, { FilterQuery } from "mongoose";
import { isValidMongoId } from "../utils/mongoUtils";

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
}).single("contract");

export const uploadMiddleware = upload;

export const detectAndConfirmContractType = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = req.user as IUser | undefined;
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded or invalid file type" });
    return;
  }

  if (!user || !user._id) {
    res.status(401).json({ error: "User not authenticated" });
    return;
  }

  let fileKey: string | undefined;
  try {
    fileKey = `file:${user._id.toString()}:${Date.now()}`;
    await redis.set(fileKey, req.file.buffer);
    await redis.expire(fileKey, 3600);

    const pdfText = await extractTextFromPDF(fileKey);
    const detectedType = await detectContractType(pdfText);

    res.json({ detectedType });
  } catch (error: any) {
    console.error("Error detecting contract type:", error.message, error.stack);
    res.status(500).json({
      error: "Failed to detect contract type",
      details: error.message,
    });
  } finally {
    if (fileKey) {
      await redis.del(fileKey);
    }
  }
};

export const analyzeContract = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = req.user as IUser | undefined;
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

  let fileKey: string | undefined;
  try {
    fileKey = `file:${user._id.toString()}:${Date.now()}`;
    await redis.set(fileKey, req.file.buffer, { ex: 3600 });

    const pdfText = await extractTextFromPDF(fileKey);
    const tier: "free" | "premium" = user.isPremium ? "premium" : "free";
    const analysisResult: ContractAnalysis = await analyzeContractWithAI(
      pdfText,
      contractType,
      user._id.toString(),
      tier
    );

    const analysis = new ContractAnalysisSchema({
      userId: new mongoose.Types.ObjectId(user._id.toString()),
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
      terminationConditions:
        analysisResult.terminationConditions || "Not specified",
      overallScore: analysisResult.overallScore ?? 0,
      compensationStructure: analysisResult.compensationStructure || {
        baseSalary: "Not specified",
        bonuses: "Not specified",
        equity: "Not specified",
        otherBenefits: "Not specified",
      },
      performanceMetrics: analysisResult.performanceMetrics || [],
      intellectualPropertyClauses: Array.isArray(
        analysisResult.intellectualPropertyClauses
      )
        ? analysisResult.intellectualPropertyClauses
        : analysisResult.intellectualPropertyClauses
        ? [analysisResult.intellectualPropertyClauses]
        : [],
      createdAt: analysisResult.createdAt || new Date(),
      version: analysisResult.version || 1,
      userFeedback: analysisResult.userFeedback || { rating: 0, comments: "" },
      customFields: analysisResult.customFields || {},
      expirationDate:
        analysisResult.expirationDate ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      language: analysisResult.language || "en",
      aiModel: analysisResult.aiModel || "gemini-1.5-flash",
      financialTerms: analysisResult.financialTerms || {
        description: "Not specified",
        details: [],
      },
    }) as IContractAnalysis;

    if (!analysis.contractText || !analysis.contractType || !analysis.summary) {
      throw new Error("Invalid analysis result: missing required fields");
    }

    const savedAnalysis = await analysis.save();
    res.json(savedAnalysis);
  } catch (error: any) {
    console.error("Error analyzing contract:", error.message, error.stack);
    res
      .status(500)
      .json({ error: "Failed to analyze contract", details: error.message });
  } finally {
    if (fileKey) {
      try {
        await redis.del(fileKey);
      } catch (redisError) {
        console.error("Error deleting Redis key:", redisError);
      }
    }
  }
};

export const getUserContracts = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = req.user as IUser | undefined;
  if (!user || !user._id) {
    res.status(401).json({ error: "User not authenticated" });
    return;
  }

  try {
    const query: FilterQuery<IContractAnalysis> = { userId: user._id };
    const contracts = await ContractAnalysisSchema.find(query).sort({
      createdAt: -1,
    });
    res.json(contracts);
  } catch (error: any) {
    console.error("Error fetching contracts:", error.message, error.stack);
    res
      .status(500)
      .json({ error: "Failed to get contracts", details: error.message });
  }
};

export const getContractByID = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user as IUser | undefined;

  if (!user || !user._id) {
    res.status(401).json({ error: "User not authenticated" });
    return;
  }

  if (!isValidMongoId(id)) {
    res.status(400).json({ error: "Invalid Contract ID" });
    return;
  }

  try {
    const cachedContract = await redis.get(`contract:${id}`);
    if (cachedContract && typeof cachedContract === "string") {
      res.json(JSON.parse(cachedContract));
      return;
    }

    const contract = await ContractAnalysisSchema.findOne({
      _id: id,
      userId: user._id,
    }).lean();

    if (!contract) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }

    await redis.set(`contract:${id}`, JSON.stringify(contract), { ex: 3600 });
    res.json(contract);
  } catch (error: any) {
    console.error("Error fetching contract:", error.message, error.stack);
    res
      .status(500)
      .json({ error: "Failed to get contract", details: error.message });
  }
};

export const deleteContract = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user as IUser | undefined;

  if (!user || !user._id) {
    res.status(401).json({ error: "User not authenticated" });
    return;
  }

  if (!isValidMongoId(id)) {
    res.status(400).json({ error: "Invalid Contract ID" });
    return;
  }

  try {
    console.log(
      `Attempting to delete contract with ID: ${id} for user: ${user._id}`
    );
    const contract = await ContractAnalysisSchema.findOneAndDelete({
      _id: id,
      userId: user._id,
    });

    if (!contract) {
      console.log(`Contract with ID ${id} not found for user ${user._id}`);
      res.status(404).json({ error: "Contract not found" });
      return;
    }

    // Clear Redis cache for this contract
    const cacheKey = `contract:${id}`;
    await redis.del(cacheKey);
    console.log(`Deleted Redis cache for ${cacheKey}`);

    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting contract:", error.message, error.stack);
    res
      .status(500)
      .json({ error: "Failed to delete contract", details: error.message });
  }
};
