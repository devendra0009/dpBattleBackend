import express from "express";
import {
  deleteUserByUserId,
  getAllUsers,
  getUserByContestId,
  getUserByUserEmail,
  getUserByUserId,
  updateFollowerFollowingByUserId,
  updateUserByUserId,
} from "../controller/userController.js";
import { authenticateToken } from "../utils/commonFunc.js";
const router = express.Router();

router
  .get("/getAllUsers", getAllUsers)
  .get("/getUserByUserEmail", getUserByUserEmail)
  .get("/getUserByUserId", authenticateToken, getUserByUserId)
  .get("/getUserByContestId", getUserByContestId)
  .patch("/updateUserByUserId", authenticateToken, updateUserByUserId)
  .patch(
    "/updateFollowerFollowingByUserId",
    authenticateToken,
    updateFollowerFollowingByUserId
  )
  .delete("/deleteUserByUserId", authenticateToken, deleteUserByUserId);

export default router;
