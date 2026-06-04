import { Application } from "../model/promotion_model.js";
import { Agreement } from "../model/agreement_model.js";
import { Notification } from "../model/notification_model.js";
import { agreementTemplate } from "../utils/agreementTemplate.js";
import {generateDOC } from "../utils/pdfGenerator.js";
import { sendEmail } from "../utils/sendEmail.js";
import User from "../model/users.js";
import { InfluencerProfile, BrandOwnerProfile } from "../model/profile.js";
import jwt from "jsonwebtoken";
import { createConversationOnAcceptance } from "../utils/conversationHelper.js";


export const reviewApplication = async (req, res) => {
  try {
    //const frontendAgreementLink = `${process.env.FRONTEND_URL}/agreement`;
  
    const userId = req.user._id;
    const { applicationId, status, notes } = req.body;

    if (!["accepted", "rejected"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const application = await Application.findById(applicationId)
      .populate("campaignId")
      .populate("influencerId");

    if (!application) return res.status(404).json({ message: "Application not found" });

    if (application.status !== "pending")
      return res.status(400).json({ message: "Application already processed" });

  const promotion = application.campaignId;

    // REJECT FLOW
    if (status === "rejected") {
      application.status = "rejected";
      application.notes = notes || "";
      await application.save();

      // Removed sticks refund logic per request

      await Notification.create({
        userId: application.influencerId._id,
        message: ` Your application for ${promotion.title} was rejected.`,
        type: "application",
      });

      return res.status(200).json({
        message: "Application rejected successfully",
      });
    }

  
    // ACCEPT FLOW — only update AFTER success
if (promotion.filledPositions >= promotion.openings) {
      return res.status(400).json({
        message: "All positions are already filled for this promotion",
      });
    }
    const brand = await BrandOwnerProfile.findOne({ userId });
    const influencer = await InfluencerProfile.findOne({ userId: application.influencerId });

    if (!brand || !influencer)
      return res.status(400).json({ message: "Profile missing" });

    const htmlContent = agreementTemplate(
      application.campaignId.title,
      brand.brandName,
      influencer.fullName
    );

    // const fileName = `agreement_${applicationId}.pdf`;
    // // PDF generation 
    // const pdfPath = await generatePDF(htmlContent, fileName);

    const fileName = `agreement_${applicationId}.docx`;
    const docPath = await generateDOC(htmlContent, fileName);


    // Create agreement record 
    const agreement = await Agreement.create({
      applicationId,
      campaignId: application.campaignId._id,
      brandOwnerId: userId,
      influencerId: influencer.userId,
      //pdfUrl: pdfPath,
      pdfUrl:docPath,
      agreementText: htmlContent,
    });
const agreementToken = jwt.sign(
  {
    agreementId: agreement._id,
    influencerId: influencer.userId,
    role: "influencer",
    type: "agreement-sign",
  },
  process.env.JWT_SECRET,
  { expiresIn: "48h" }
);
 const frontendAgreementLink =
  `${process.env.FRONTEND_URL}/agreement?token=${agreementToken}`;

    // Email sending (may fail)
    await sendEmail(
      influencer.email,
      `Agreement for Campaign: ${promotion.title}`,
      `
        <p>Hello ${influencer.firstName},</p>
        <p>Congratulations! 🎉 You have been accepted to the 
          <b>${promotion.title}</b> campaign.</p>

        <p>Your agreement PDF is attached.</p>
        <p>Please sign here:</p>

        <p>
          <a href="${frontendAgreementLink}" 
             style="color: purple; font-weight: bold;">
             Click here to sign your agreement
          </a>
        </p>
      `,
      [
        {
          filename: fileName,
          // path: pdfPath,
          // contentType: "application/pdf",
          path: docPath,
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      ]
    );


    //  If we reached here, ALL steps succeeded, NOW update application to accepted
    
    application.status = "accepted";
    application.notes = notes || "";
    await application.save();
      promotion.filledPositions += 1;
        if (promotion.filledPositions >= promotion.openings) {
      promotion.applicationStatus = "closed";
    }
      await promotion.save();
    
    // Create final notification
    await Notification.create({
      userId: application.influencerId._id,
      message: `🎉 You are accepted for campaign: ${promotion.title}`,
      type: "application",
    });

    // 🆕 AUTO-CREATE CONVERSATION - Send welcome message
    try {
      await createConversationOnAcceptance(
        applicationId,
        userId, // Brand owner user ID
        application.influencerId._id, // Influencer user ID
        promotion.title // Campaign title
      );
      console.log('✅ Conversation auto-created successfully');
    } catch (convError) {
      console.error('⚠️ Failed to create conversation, but application was accepted:', convError);
      // Don't fail the whole request if conversation creation fails
    }

    return res.status(200).json({
      message: "Application accepted and agreement sent",
      agreement,
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Failed to accept application. Nothing was updated.",
      error: err.message,
    });
  }
};

export const getAgreements = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch agreements for the user
    const agreements = await Agreement.find({
      $or: [{ influencerId: userId }, { brandOwnerId: userId }]
    })
    .populate("campaignId")
    .populate("influencerId")
    .populate("brandOwnerId");

    if (!agreements.length)
      return res.status(404).json({ message: "No agreements found" });

    // Enhance agreements with profile data
    const enhancedAgreements = await Promise.all(
      agreements.map(async (agreement) => {
        const agreementObj = agreement.toObject();
        
        // Get brand owner profile
        if (agreementObj.brandOwnerId) {
          const brandProfile = await BrandOwnerProfile.findOne({ 
            userId: agreementObj.brandOwnerId._id 
          }).select('brandName brandLogo');
          
          if (brandProfile) {
            agreementObj.brandName = brandProfile.brandName;
            agreementObj.brandLogo = brandProfile.brandLogo;
          } else {
            // Fallback to user's name
            const firstName = agreementObj.brandOwnerId.firstName?.trim() || '';
            const lastName = agreementObj.brandOwnerId.lastName?.trim() || '';
            agreementObj.brandName = `${firstName} ${lastName}`.trim() || 'Brand Owner';
          }
        }
        
        // Get influencer profile
        if (agreementObj.influencerId) {
          const influencerProfile = await InfluencerProfile.findOne({ 
            userId: agreementObj.influencerId._id 
          }).select('firstName lastName userName');
          
          if (influencerProfile) {
            agreementObj.influencerName = `${influencerProfile.firstName || ''} ${influencerProfile.lastName || ''}`.trim() || influencerProfile.userName;
          } else {
            // Fallback to user's name
            const firstName = agreementObj.influencerId.firstName?.trim() || '';
            const lastName = agreementObj.influencerId.lastName?.trim() || '';
            agreementObj.influencerName = `${firstName} ${lastName}`.trim() || 'Influencer';
          }
        }
        
        // Add campaign title
        if (agreementObj.campaignId) {
          agreementObj.campaignTitle = agreementObj.campaignId.title;
          agreementObj.budget = agreementObj.campaignId.budget;
        }
        
        // Set status based on signature
        agreementObj.status = agreementObj.influencerSigned ? 'signed' : 'pending';
        
        return agreementObj;
      })
    );

    return res.status(200).json({
      message: "Agreements fetched successfully",
      agreements: enhancedAgreements
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error" });
  }
};

export const signAgreement = async (req, res) => {
  try {
    // Handle token-based signing (from email link)
    if (req.body.token) {
      const { token } = req.body;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== "agreement-sign")
        return res.status(400).json({ message: "Invalid token" });

      const agreement = await Agreement.findById(decoded.agreementId);
      if (!agreement)
        return res.status(404).json({ message: "Agreement not found" });

      if (agreement.influencerSigned)
        return res.status(400).json({ message: "Already signed" });

      if (agreement.influencerId.toString() !== decoded.influencerId)
        return res.status(403).json({ message: "Unauthorized" });

      agreement.influencerSigned = true;
      agreement.signedAt = new Date();
      await agreement.save();

      // Notify brand owner
      await Notification.create({
        userId: agreement.brandOwnerId,
        message: `📑 Influencer signed agreement for campaign.`,
        type: "agreement",
      });

      return res.status(200).json({ 
        success: true,
        message: "Agreement signed successfully" 
      });
    }
    
    // Handle direct signing (from app with auth)
    if (req.user) {
      const userId = req.user._id;
      const { agreementId } = req.body;

      if (!agreementId) {
        return res.status(400).json({ 
          success: false,
          message: "Agreement ID required" 
        });
      }

      const agreement = await Agreement.findById(agreementId);

      if (!agreement) {
        return res.status(404).json({ 
          success: false,
          message: "Agreement not found" 
        });
      }

      // Check if user is the influencer
      if (agreement.influencerId.toString() !== userId.toString()) {
        return res.status(403).json({ 
          success: false,
          message: "Unauthorized to sign this agreement" 
        });
      }

      if (agreement.influencerSigned) {
        return res.status(400).json({ 
          success: false,
          message: "Agreement already signed" 
        });
      }

      agreement.influencerSigned = true;
      agreement.signedAt = new Date();
      await agreement.save();

      // Notify brand owner
      await Notification.create({
        userId: agreement.brandOwnerId,
        message: `📑 Influencer signed agreement for campaign.`,
        type: "agreement",
      });

      return res.status(200).json({ 
        success: true,
        message: "Agreement signed successfully",
        agreement
      });
    }

    return res.status(400).json({ 
      success: false,
      message: "Invalid request" 
    });

  } catch (err) {
    console.error("Sign agreement error:", err);
    return res.status(500).json({ 
      success: false,
      message: err.name === 'JsonWebTokenError' ? "Invalid or expired token" : "Server Error" 
    });
  }
};


// export const signAgreement = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { agreementId } = req.body;

//     const agreement = await Agreement.findById(agreementId);

//     if (!agreement) return res.status(404).json({ message: "Agreement not found" });

//     if (agreement.influencerSigned)
//       return res.status(400).json({ message: "Already signed" });

//     agreement.influencerSigned = true;
//     agreement.signedAt = new Date();
//     await agreement.save();

//     // Notify brand owner
//     await Notification.create({
//       userId: agreement.brandOwnerId,
//       message: `📑 Influencer signed agreement for campaign.`,
//       type: "agreement",
//     });

//     return res.status(200).json({ message: "Agreement signed successfully" });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: "Server Error" });
//   }
// };

// export const reviewApplication = async (req, res) => {
//   try {
//     //const frontendAgreementLink = `${process.env.FRONTEND_URL}/agreement`;
  
//     const userId = req.user._id;
//     const { applicationId, status, notes } = req.body;

//     if (!["accepted", "rejected"].includes(status))
//       return res.status(400).json({ message: "Invalid status" });

//     const application = await Application.findById(applicationId)
//       .populate("campaignId")
//       .populate("influencerId");

//     if (!application) return res.status(404).json({ message: "Application not found" });

//     if (application.status !== "pending")
//       return res.status(400).json({ message: "Application already processed" });

//   const promotion = application.campaignId;

//     // REJECT FLOW
//     if (status === "rejected") {
//       application.status = "rejected";
//       application.notes = notes || "";
//       await application.save();

//       await Notification.create({
//         userId: application.influencerId._id,
//         message: ` Your application for ${promotion.title} was rejected.`,
//         type: "application",
//       });

//       return res.status(200).json({
//         message: "Application rejected successfully",
//       });
//     }

  
//     // ACCEPT FLOW — only update AFTER success
// if (promotion.filledPositions >= promotion.openings) {
//       return res.status(400).json({
//         message: "All positions are already filled for this promotion",
//       });
//     }
//     const brand = await BrandOwnerProfile.findOne({ userId });
//     const influencer = await InfluencerProfile.findOne({ userId: application.influencerId });

//     if (!brand || !influencer)
//       return res.status(400).json({ message: "Profile missing" });

//     const htmlContent = agreementTemplate(
//       application.campaignId.title,
//       brand.brandName,
//       influencer.fullName
//     );

//     const fileName = `agreement_${applicationId}.pdf`;

//     // PDF generation 
//     const pdfPath = await generatePDF(htmlContent, fileName);

//     // Create agreement record 
//     const agreement = await Agreement.create({
//       applicationId,
//       campaignId: application.campaignId._id,
//       brandOwnerId: userId,
//       influencerId: influencer.userId,
//       pdfUrl: pdfPath,
//       agreementText: htmlContent,
//     });
// const agreementToken = jwt.sign(
//   {
//     agreementId: agreement._id,
//     influencerId: influencer.userId,
//     role: "influencer",
//     type: "agreement-sign",
//   },
//   process.env.JWT_SECRET,
//   { expiresIn: "48h" }
// );
//  const frontendAgreementLink =
//   `${process.env.FRONTEND_URL}/agreement?token=${agreementToken}`;

//     // Email sending (may fail)
//     await sendEmail(
//       influencer.email,
//       `Agreement for Campaign: ${promotion.title}`,
//       `
//         <p>Hello ${influencer.firstName},</p>
//         <p>Congratulations! 🎉 You have been accepted to the 
//           <b>${promotion.title}</b> campaign.</p>

//         <p>Your agreement PDF is attached.</p>
//         <p>Please sign here:</p>

//         <p>
//           <a href="${frontendAgreementLink}" 
//              style="color: purple; font-weight: bold;">
//              Click here to sign your agreement
//           </a>
//         </p>
//       `,
//       [
//         {
//           filename: fileName,
//           path: pdfPath,
//           contentType: "application/pdf",
//         },
//       ]
//     );


//     //  If we reached here, ALL steps succeeded, NOW update application to accepted
    
//     application.status = "accepted";
//     application.notes = notes || "";
//     await application.save();
//       promotion.filledPositions += 1;
//         if (promotion.filledPositions >= promotion.openings) {
//       promotion.applicationStatus = "closed";
//     }
//       await promotion.save();
//     // Create final notification
//     await Notification.create({
//       userId: application.influencerId._id,
//       message: `🎉 You are accepted for campaign: ${promotion.title}`,
//       type: "application",
//     });

//     return res.status(200).json({
//       message: "Application accepted and agreement sent",
//       agreement,
//     });

//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({
//       message: "Failed to accept application. Nothing was updated.",
//       error: err.message,
//     });
//   }
// };
//worked 
// export const reviewApplication = async (req, res) => {
//   try {
//     const frontendAgreementLink = `${process.env.FRONTEND_URL}/agreement`;
//     const userId = req.user._id;
//     const { applicationId, status, notes } = req.body;

//     if (!["accepted", "rejected"].includes(status))
//       return res.status(400).json({ message: "Invalid status" });

//     const application = await Application.findById(applicationId)
//       .populate("campaignId")
//       .populate("influencerId");

//     if (!application) return res.status(404).json({ message: "Application not found" });

//     if (application.status !== "pending")
//       return res.status(400).json({ message: "Application already processed" });

//     application.status = status;
//     application.notes = notes || "";
//     await application.save();

//     await Notification.create({
//       userId: application.influencerId._id,
//       message:
//         status === "accepted"
//           ? `🎉 You are accepted for campaign: ${application.campaignId.title}`
//           : `❌ Your application for ${application.campaignId.title} was rejected.`,
//       type: "application",
//     });

//     if (status === "rejected") {
//       return res.status(200).json({ message: "Application rejected successfully" });
//     }

//     // --------------------- FIXED NAME FETCHING -------------------------
//     const brand = await BrandOwnerProfile.findOne({ userId });
//     const influencer = await InfluencerProfile.findOne({ userId: application.influencerId });

//     const htmlContent = agreementTemplate(
//       application.campaignId.title,
//       brand.brandName,
//       influencer.fullName
//     );

//     const fileName = `agreement_${applicationId}.pdf`;
//     const pdfPath = await generatePDF(htmlContent, fileName);

//     // --------------------- FIXED FIELD NAME -------------------------
//     const agreement = await Agreement.create({
//       applicationId,
//       campaignId: application.campaignId._id,
//       brandOwnerId: userId,
//       influencerId: influencer.userId,
//       pdfUrl: pdfPath,
//       agreementText: htmlContent,
//     });

//     // --------------------- ATTACHMENT FIX -------------------------
//     // await sendEmail(
//     //   influencer.email,
//     //   `Agreement for Campaign: ${application.campaignId.title}`,
//     //   `<p>Hello ${influencer.fullName},</p>
//     //    <p>Congratulations! You have been accepted to the <b>${application.campaignId.title}</b> campaign.</p>
//     //    <p>Your agreement is attached. Please review and sign.</p>`,
//     //   [
//     //     {
//     //       filename: fileName,
//     //       path: pdfPath,
//     //       contentType: "application/pdf"
//     //     }
//     //   ]
//     // );
// await sendEmail(
//   influencer.email,
//   `Agreement for Campaign: ${application.campaignId.title}`,
//   `
//     <p>Hello ${influencer.fullName},</p>

//     <p>Congratulations! 🎉 You have been accepted to the 
//       <b>${application.campaignId.title}</b> campaign.</p>

//     <p>Your agreement PDF is attached.</p>

//     <p>Please review the agreement and sign it using the link below:</p>

//     <p>
//       <a href="${frontendAgreementLink}" 
//          style="color: purple; font-weight: bold;">
//          Click here to sign your agreement
//       </a>
//     </p>

//     <p>Thank you,<br/>SpreadB Team</p>
//   `,
//   [
//     {
//       filename: fileName,
//       path: pdfPath,
//       contentType: "application/pdf"
//     }
//   ]
// );

//     return res.status(200).json({
//       message: "Application accepted and agreement sent",
//       agreement,
//     });

//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ message: "Server Error" });
//   }
// };


// import { Application } from "../model/promotion_model.js";
// import { Agreement } from "../model/agreement_model.js";
// import { Notification } from "../model/notification_model.js";
// import { agreementTemplate } from "../utils/agreementTemplate.js";
// import { generatePDF } from "../utils/pdfGenerator.js";
// import { sendEmail } from "../utils/sendEmail.js";
// import User from "../model/users.js";
// import { InfluencerProfile, BrandOwnerProfile } from "../model/profile.js";
// export const reviewApplication = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { applicationId, status, notes } = req.body;

//     if (!["accepted", "rejected"].includes(status))
//       return res.status(400).json({ message: "Invalid status" });

//     const application = await Application.findById(applicationId)
//       .populate("campaignId")
//       .populate("influencerId");

//     if (!application) return res.status(404).json({ message: "Application not found" });

//     if (application.status !== "pending")
//       return res.status(400).json({ message: "Application already processed" });

//     application.status = status;
//     application.notes = notes || "";
//     await application.save();

//     await Notification.create({
//       userId: application.influencerId._id,
//       message:
//         status === "accepted"
//           ? `🎉 You are accepted for campaign: ${application.campaignId.title}`
//           : `❌ Your application for ${application.campaignId.title} was rejected.`,
//       type: "application",
//     });

//     if (status === "rejected") {
//       return res.status(200).json({ message: "Application rejected successfully" });
//     }

//     // --------------------- FIXED NAME FETCHING -------------------------
//     const brand = await BrandOwnerProfile.findOne({ userId });
//     const influencer = await InfluencerProfile.findOne({ userId: application.influencerId });

//     const htmlContent = agreementTemplate(
//       application.campaignId.title,
//       brand.brandName,
//       influencer.fullName
//     );

//     const fileName = `agreement_${applicationId}.pdf`;
//     const pdfPath = await generatePDF(htmlContent, fileName);

//     // --------------------- FIXED FIELD NAME -------------------------
//     const agreement = await Agreement.create({
//       applicationId,
//       campaignId: application.campaignId._id,
//       brandOwnerId: userId,
//       influencerId: influencer.userId,
//       pdfUrl: pdfPath,
//       agreementText: htmlContent,
//     });

//     // --------------------- ATTACHMENT FIX -------------------------
//     await sendEmail(
//       influencer.email,
//       `Agreement for Campaign: ${application.campaignId.title}`,
//       `<p>Hello ${influencer.fullName},</p>
//        <p>Congratulations! You have been accepted to the <b>${application.campaignId.title}</b> campaign.</p>
//        <p>Your agreement is attached. Please review and sign.</p>`,
//       [
//         {
//           filename: fileName,
//           path: pdfPath,
//           contentType: "application/pdf"
//         }
//       ]
//     );

//     return res.status(200).json({
//       message: "Application accepted and agreement sent",
//       agreement,
//     });

//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ message: "Server Error" });
//   }
// };