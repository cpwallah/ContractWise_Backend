import { getDocument } from "pdfjs-dist";
import redis from "../config/redis";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface IRisk {
  risk: string;
  explanation: string;
  severity: "low" | "medium" | "high";
}

export interface IOpportunity {
  opportunity: string;
  explanation: string;
  impact: "low" | "medium" | "high";
}

export interface ICompensationStructure {
  baseSalary: string;
  bonuses: string;
  equity: string;
  otherBenefits: string;
}

export interface ContractAnalysis {
  userId: string;
  contractText: string;
  contractType: string;
  risks: IRisk[];
  opportunities: IOpportunity[];
  summary: string;
  recommendations: string[];
  keyClauses: string[];
  legalCompliance: string[];
  negotiationPoints: string[];
  contractDuration: string;
  terminationConditions: string;
  overallScore: number;
  compensationStructure: ICompensationStructure;
  performanceMetrics: string[];
  intellectualPropertyClauses: string | string[];
  createdAt: Date;
  version: number;
  userFeedback: { rating: number; comments: string };
  customFields: { [key: string]: string };
  expirationDate: Date;
  language: string;
  aiModel: string;
  financialTerms?: { description: string; details: string[] };
}

const AI_MODEL = "gemini-1.5-flash";
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({ model: AI_MODEL });

export const extractTextFromPDF = async (fileKey: string): Promise<string> => {
  try {
    const fileData = await redis.get(fileKey);
    if (!fileData) {
      throw new Error("file not found");
    }
    let fileBuffer: Uint8Array;
    if (Buffer.isBuffer(fileData)) {
      fileBuffer = new Uint8Array(fileData);
    } else if (typeof fileData === "object" && fileData !== null) {
      const bufferData = fileData as { type?: string; data?: number[] };
      if (bufferData.type === "Buffer" && Array.isArray(bufferData.data)) {
        fileBuffer = new Uint8Array(bufferData.data);
      } else {
        throw new Error("Invalid file data");
      }
    } else {
      throw new Error("Invalid file data");
    }
    const pdf = await getDocument({ data: fileBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(
      `Failed to extract text from PDF. ERROR: ${JSON.stringify(error)}`
    );
  }
};

export const detectContractType = async (
  contractText: string
): Promise<string> => {
  const prompt: string = `
    Analyze the following contract text and determine the type of contract.
    Provide only the contract type as a string (e.g., "Employment", "Non-disclosure Agreement", "Sales", "Lease", etc.).
    Do not include any additional explanation or text.

    Contract text:
    ${contractText.substring(0, 2000)}
  `;
  const results = await aiModel.generateContent(prompt);
  const response = results.response;
  return response.text().trim();
};

export const analyzeContractWithAI = async (
  contractText: string,
  contractType: string,
  userId: string,
  tier: "free" | "premium"
): Promise<ContractAnalysis> => {
  const prompt: string =
    tier === "premium"
      ? `
    Analyze the following ${contractType} contract and provide a detailed analysis in JSON format with the following fields:

    - overallScore: A number between 0 and 100 representing the overall quality of the contract, considering risks and opportunities. Example: 75
    - summary: A brief summary of the contract, including key terms and conditions. Example: "This employment contract offers a competitive salary but has strict non-compete clauses."
    - risks: An array of at least 10 objects with risk, explanation, and severity (low, medium, high). Example: [{"risk": "Non-compete clause", "explanation": "Restricts future employment opportunities", "severity": "high"}]
    - opportunities: An array of at least 10 objects with opportunity, explanation, and impact (low, medium, high). Example: [{"opportunity": "High salary", "explanation": "Above market rate", "impact": "high"}]
    - keyClauses: An array of key clauses extracted from the contract. Example: ["Non-compete clause", "Confidentiality clause"]
    - recommendations: An array of recommendations to improve the contract. Example: ["Negotiate shorter non-compete period", "Add performance bonus"]
    - legalCompliance: An array of strings describing legal compliance aspects. Example: ["Compliant with local labor laws", "GDPR compliant"]
    - negotiationPoints: An array of potential negotiation points. Example: ["Salary increase", "Flexible hours"]
    - contractDuration: A string describing the duration of the contract. Example: "2 years"
    - terminationConditions: A string describing the termination conditions. Example: "30 days notice"
    - compensationStructure: An object with baseSalary, bonuses, equity, and otherBenefits. Example: {"baseSalary": "$100,000/year", "bonuses": "Up to $10,000", "equity": "0.1% stock options", "otherBenefits": "Health insurance"}
    - performanceMetrics: An array of performance metrics or KPIs. Example: ["Sales targets", "Project deadlines"]
    - intellectualPropertyClauses: An array of intellectual property clauses. Example: ["IP ownership by employer", "Non-disclosure of IP"]
    - financialTerms: An optional object with description and details. Example: {"description": "Payment terms", "details": ["Monthly payments", "Net 30 terms"]}

    Format your response as a JSON object with the following structure:
    {
      "userId": "${userId}",
      "contractText": "${contractText.substring(0, 1000)}",
      "contractType": "${contractType}",
      "risks": [{"risk": "string", "explanation": "string", "severity": "low|medium|high"}],
      "opportunities": [{"opportunity": "string", "explanation": "string", "impact": "low|medium|high"}],
      "summary": "string",
      "recommendations": ["string"],
      "keyClauses": ["string"],
      "legalCompliance": ["string"],
      "negotiationPoints": ["string"],
      "contractDuration": "string",
      "terminationConditions": "string",
      "overallScore": number,
      "compensationStructure": {
        "baseSalary": "string",
        "bonuses": "string",
        "equity": "string",
        "otherBenefits": "string"
      },
      "performanceMetrics": ["string"],
      "intellectualPropertyClauses": ["string"],
      "createdAt": "${new Date().toISOString()}",
      "version": 1,
      "userFeedback": {"rating": 0, "comments": ""},
      "customFields": {},
      "expirationDate": "${new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString()}",
      "language": "en",
      "aiModel": "${AI_MODEL}",
      "financialTerms": {"description": "string", "details": ["string"]}
    }

    Important: Provide only the JSON object in your response, without any additional text or formatting.
    Contract text:
    ${contractText}
  `
      : `
    Analyze the following ${contractType} contract and provide a detailed analysis in JSON format with the following fields:
      - risks: An array of at least 10 objects with risk, explanation, and severity (low, medium, high). Example: [{"risk": "Non-compete clause", "explanation": "Restricts future employment opportunities", "severity": "high"}]
      - opportunities: An array of at least 10 objects with opportunity, explanation, and impact (low, medium, high). Example: [{"opportunity": "High salary", "explanation": "Above market rate", "impact": "high"}]
      - overallScore: A number between 0 and 100 representing the overall quality of the contract, considering risks and opportunities. Example: 75
      - summary: A brief summary of the contract
    Format your response as a JSON object with the following structure:
    {
      "userId": "${userId}",
      "contractText": "${contractText.substring(0, 1000)}",
      "contractType": "${contractType}",
      "risks": [{"risk": "string", "explanation": "string", "severity": "low|medium|high"}],
      "opportunities": [{"opportunity": "string", "explanation": "string", "impact": "low|medium|high"}],
      "summary": "string",
      "overallScore": number
    }

    Important: Provide only the JSON object in your response, without any additional text or formatting.
    Contract text:
    ${contractText.substring(0, 1000)}
  `;

  try {
    const results = await aiModel.generateContent(prompt);
    const response = results.response;
    let text = response.text();

    // Log the raw response for debugging
    console.log("Raw response from Gemini 1.5 Flash:", text);

    // Clean up the response text
    text = text.replace(/```json\n?|\n?```/g, "").trim();
    text = text.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Add quotes around keys
    text = text.replace(/:\s*"([^"]*)"([^,}\]])/g, ':"$1"$2'); // Fix values
    text = text.replace(/,\s*}/g, "}"); // Remove trailing commas

    let analysis: ContractAnalysis;
    try {
      analysis = JSON.parse(text) as ContractAnalysis;
    } catch (parseError) {
      console.error("Error parsing AI response as JSON:", parseError);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Post-process to fill missing fields
    let processedAnalysis: ContractAnalysis = {
      ...analysis,
      createdAt: new Date(analysis.createdAt || new Date().toISOString()),
      expirationDate: new Date(
        analysis.expirationDate || Date.now() + 30 * 24 * 60 * 60 * 1000
      ),
      version: analysis.version || 1,
      userFeedback: analysis.userFeedback || { rating: 0, comments: "" },
      customFields: analysis.customFields || {},
      language: analysis.language || "en",
      aiModel: analysis.aiModel || AI_MODEL,
    };

    // Calculate overallScore if missing
    if (
      processedAnalysis.overallScore === undefined ||
      Number.isNaN(processedAnalysis.overallScore)
    ) {
      const riskScore = processedAnalysis.risks.reduce((sum, r) => {
        return (
          sum + (r.severity === "high" ? 20 : r.severity === "medium" ? 10 : 5)
        );
      }, 0);
      const opportunityScore = processedAnalysis.opportunities.reduce(
        (sum, o) => {
          return (
            sum + (o.impact === "high" ? 20 : o.impact === "medium" ? 10 : 5)
          );
        },
        0
      );
      processedAnalysis.overallScore = Math.max(
        0,
        Math.min(100, 50 - riskScore + opportunityScore)
      );
    }

    // Fill missing fields for premium tier
    if (tier === "premium") {
      // Infer contractDuration if missing
      if (!processedAnalysis.contractDuration) {
        const durationMatch = contractText.match(
          /(?:duration|term)\s*:\s*(\d+\s*(?:year|month|day)s?)/i
        );
        processedAnalysis.contractDuration = durationMatch
          ? durationMatch[1]
          : "Not specified";
      }

      // Infer terminationConditions if missing
      if (!processedAnalysis.terminationConditions) {
        const terminationMatch = contractText.match(
          /(?:termination|notice period)\s*:\s*(\d+\s*days)/i
        );
        processedAnalysis.terminationConditions = terminationMatch
          ? terminationMatch[1]
          : "Not specified";
      }

      // Infer legalCompliance if missing
      if (
        !processedAnalysis.legalCompliance ||
        processedAnalysis.legalCompliance.length === 0
      ) {
        processedAnalysis.legalCompliance = contractText.includes("compliance")
          ? ["Compliant with local laws"]
          : [];
      }

      // Infer keyClauses if missing
      if (
        !processedAnalysis.keyClauses ||
        processedAnalysis.keyClauses.length === 0
      ) {
        processedAnalysis.keyClauses = [];
        if (contractText.includes("confidentiality"))
          processedAnalysis.keyClauses.push("Confidentiality clause");
        if (contractText.includes("non-compete"))
          processedAnalysis.keyClauses.push("Non-compete clause");
        if (processedAnalysis.keyClauses.length === 0)
          processedAnalysis.keyClauses.push("No key clauses identified");
      }

      // Infer recommendations if missing
      if (
        !processedAnalysis.recommendations ||
        processedAnalysis.recommendations.length === 0
      ) {
        processedAnalysis.recommendations = processedAnalysis.risks.map(
          (r) => `Mitigate risk: ${r.risk}`
        );
        if (processedAnalysis.recommendations.length === 0) {
          processedAnalysis.recommendations.push(
            "No recommendations available"
          );
        }
      }

      // Ensure compensationStructure is populated
      if (!processedAnalysis.compensationStructure) {
        processedAnalysis.compensationStructure = {
          baseSalary: "Not specified",
          bonuses: "Not specified",
          equity: "Not specified",
          otherBenefits: "Not specified",
        };
      }

      // Ensure intellectualPropertyClauses is an array
      if (typeof processedAnalysis.intellectualPropertyClauses === "string") {
        processedAnalysis.intellectualPropertyClauses = [
          processedAnalysis.intellectualPropertyClauses,
        ];
      } else if (!processedAnalysis.intellectualPropertyClauses) {
        processedAnalysis.intellectualPropertyClauses = contractText.includes(
          "intellectual property"
        )
          ? ["IP ownership clause"]
          : [];
      }

      // Ensure negotiationPoints is populated
      if (
        !processedAnalysis.negotiationPoints ||
        processedAnalysis.negotiationPoints.length === 0
      ) {
        processedAnalysis.negotiationPoints = [
          "No negotiation points identified",
        ];
      }

      // Ensure performanceMetrics is populated
      if (
        !processedAnalysis.performanceMetrics ||
        processedAnalysis.performanceMetrics.length === 0
      ) {
        processedAnalysis.performanceMetrics = [
          "No performance metrics specified",
        ];
      }

      // Ensure financialTerms is populated
      if (!processedAnalysis.financialTerms) {
        processedAnalysis.financialTerms = {
          description: "Not specified",
          details: [],
        };
      }
    }

    // Log the processed analysis
    console.log("Processed analysis:", processedAnalysis);

    return processedAnalysis;
  } catch (err) {
    console.error("Error in analyzeContractWithAI:", err);

    // Fallback analysis
    const fallbackAnalysis: ContractAnalysis = {
      userId,
      contractText: contractText.substring(0, 1000),
      contractType,
      risks: [],
      opportunities: [],
      summary: "Error analyzing contract",
      recommendations: tier === "premium" ? ["Review contract manually"] : [],
      keyClauses: tier === "premium" ? ["No key clauses identified"] : [],
      legalCompliance: tier === "premium" ? [] : [],
      negotiationPoints: tier === "premium" ? [] : [],
      contractDuration: tier === "premium" ? "Not specified" : "",
      terminationConditions: tier === "premium" ? "Not specified" : "",
      overallScore: 0,
      compensationStructure:
        tier === "premium"
          ? {
              baseSalary: "Not specified",
              bonuses: "Not specified",
              equity: "Not specified",
              otherBenefits: "Not specified",
            }
          : {
              baseSalary: "",
              bonuses: "",
              equity: "",
              otherBenefits: "",
            },
      performanceMetrics: tier === "premium" ? [] : [],
      intellectualPropertyClauses: tier === "premium" ? [] : [],
      createdAt: new Date(),
      version: 1,
      userFeedback: { rating: 0, comments: "" },
      customFields: {},
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      language: "en",
      aiModel: AI_MODEL,
      financialTerms:
        tier === "premium" ? { description: "", details: [] } : undefined,
    };

    let text = "";
    try {
      const results = await aiModel.generateContent(prompt);
      const response = await results.response;
      text = response.text();
      text = text.replace(/```json\n?|\n?```/g, "").trim();
    } catch (innerErr) {
      console.error("Error fetching response in fallback:", innerErr);
    }

    // Extract fields using regex
    const risksMatch = text.match(/"risks"\s*:\s*\[([\s\S]*?)\](?=\s*,|\s*})/);
    if (risksMatch) {
      try {
        const risksArray = risksMatch[1]
          .split("},")
          .map((r) => (r.trim().endsWith("}") ? r : r + "}"));
        fallbackAnalysis.risks = risksArray.map((risk) => {
          const riskMatch = risk.match(/"risk"\s*:\s*"([^"]*)"/);
          const explanationMatch = risk.match(/"explanation"\s*:\s*"([^"]*)"/);
          const severityMatch = risk.match(/"severity"\s*:\s*"([^"]*)"/);
          return {
            risk: riskMatch ? riskMatch[1] : "Unknown",
            explanation: explanationMatch ? explanationMatch[1] : "Unknown",
            severity: severityMatch
              ? (severityMatch[1] as "low" | "medium" | "high")
              : "medium",
          };
        });
      } catch (e) {
        console.error("Error parsing risks:", e);
      }
    }

    const opportunitiesMatch = text.match(
      /"opportunities"\s*:\s*\[([\s\S]*?)\](?=\s*,|\s*})/
    );
    if (opportunitiesMatch) {
      try {
        const opportunitiesArray = opportunitiesMatch[1]
          .split("},")
          .map((o) => (o.trim().endsWith("}") ? o : o + "}"));
        fallbackAnalysis.opportunities = opportunitiesArray.map((opp) => {
          const opportunityMatch = opp.match(/"opportunity"\s*:\s*"([^"]*)"/);
          const explanationMatch = opp.match(/"explanation"\s*:\s*"([^"]*)"/);
          const impactMatch = opp.match(/"impact"\s*:\s*"([^"]*)"/);
          return {
            opportunity: opportunityMatch ? opportunityMatch[1] : "Unknown",
            explanation: explanationMatch ? explanationMatch[1] : "Unknown",
            impact: impactMatch
              ? (impactMatch[1] as "low" | "medium" | "high")
              : "medium",
          };
        });
      } catch (e) {
        console.error("Error parsing opportunities:", e);
      }
    }

    const summaryMatch = text.match(/"summary"\s*:\s*"([^"]*)"/);
    if (summaryMatch) {
      fallbackAnalysis.summary = summaryMatch[1];
    }

    const overallScoreMatch = text.match(/"overallScore"\s*:\s*(\d+)/);
    if (overallScoreMatch) {
      fallbackAnalysis.overallScore = parseInt(overallScoreMatch[1], 10);
    } else {
      const riskScore = fallbackAnalysis.risks.reduce((sum, r) => {
        return (
          sum + (r.severity === "high" ? 20 : r.severity === "medium" ? 10 : 5)
        );
      }, 0);
      const opportunityScore = fallbackAnalysis.opportunities.reduce(
        (sum, o) => {
          return (
            sum + (o.impact === "high" ? 20 : o.impact === "medium" ? 10 : 5)
          );
        },
        0
      );
      fallbackAnalysis.overallScore = Math.max(
        0,
        Math.min(100, 50 - riskScore + opportunityScore)
      );
    }

    if (tier === "premium") {
      const keyClausesMatch = text.match(
        /"keyClauses"\s*:\s*\[([\s\S]*?)\](?=\s*,|\s*})/
      );
      if (keyClausesMatch) {
        try {
          fallbackAnalysis.keyClauses = keyClausesMatch[1]
            .replace(/[\[\]]/g, "")
            .split(",")
            .map((item: string) => item.replace(/"/g, "").trim())
            .filter((item: string) => item);
        } catch (e) {
          console.error("Error parsing keyClauses:", e);
        }
      }

      const recommendationsMatch = text.match(
        /"recommendations"\s*:\s*\[([\s\S]*?)\](?=\s*,|\s*})/
      );
      if (recommendationsMatch) {
        try {
          fallbackAnalysis.recommendations = recommendationsMatch[1]
            .replace(/[\[\]]/g, "")
            .split(",")
            .map((item: string) => item.replace(/"/g, "").trim())
            .filter((item: string) => item);
        } catch (e) {
          console.error("Error parsing recommendations:", e);
        }
      }

      const legalComplianceMatch = text.match(
        /"legalCompliance"\s*:\s*\[([\s\S]*?)\](?=\s*,|\s*})/
      );
      if (legalComplianceMatch) {
        try {
          fallbackAnalysis.legalCompliance = legalComplianceMatch[1]
            .replace(/[\[\]]/g, "")
            .split(",")
            .map((item: string) => item.replace(/"/g, "").trim())
            .filter((item: string) => item);
        } catch (e) {
          console.error("Error parsing legalCompliance:", e);
        }
      }

      const contractDurationMatch = text.match(
        /"contractDuration"\s*:\s*"([^"]*)"/
      );
      if (contractDurationMatch) {
        fallbackAnalysis.contractDuration = contractDurationMatch[1];
      } else {
        const durationMatch = contractText.match(
          /(?:duration|term)\s*:\s*(\d+\s*(?:year|month|day)s?)/i
        );
        fallbackAnalysis.contractDuration = durationMatch
          ? durationMatch[1]
          : "Not specified";
      }

      const terminationConditionsMatch = text.match(
        /"terminationConditions"\s*:\s*"([^"]*)"/
      );
      if (terminationConditionsMatch) {
        fallbackAnalysis.terminationConditions = terminationConditionsMatch[1];
      } else {
        const terminationMatch = contractText.match(
          /(?:termination|notice period)\s*:\s*(\d+\s*days)/i
        );
        fallbackAnalysis.terminationConditions = terminationMatch
          ? terminationMatch[1]
          : "Not specified";
      }
    }

    return fallbackAnalysis;
  }
};
