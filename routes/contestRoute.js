import express from "express";
import {
  createContest,
  createContestWithFriend,
  deleteContestByContestId,
  deleteContestByUserId,
  getAllContests,
  getContestByContestId,
  getContestByUserId,
  joinContest,
  updateContest,
} from "../controller/contestController.js";
import singleUploadMulter from "../middleware/singleUploadMulter.js";
import mulitpleUploadMulter from "../middleware/multipleUploadMulter.js";
import { authenticateToken } from "../utils/commonFunc.js";
const router = express.Router();

router
  .get("/getAllContests", getAllContests)
  .get("/getContestByContestId/:id", getContestByContestId)
  .get("/getContestByUserId", getContestByUserId)
  .post("/createContest", authenticateToken, singleUploadMulter, createContest)
  .post(
    "/createContestWithFriend",
    authenticateToken,
    mulitpleUploadMulter,
    createContestWithFriend
  )
  .patch("/joinContest/:id", authenticateToken, singleUploadMulter, joinContest)
  .patch("/updateContest", authenticateToken, updateContest) // if contest is active but date is expired so update
  // .delete('/deleteContestByContestId', deleteContestByContestId); // this can be done by Admin only
  .delete(
    "/deleteContestByContestId",
    authenticateToken,
    deleteContestByContestId
  )
  .delete("/deleteContestByUserId", authenticateToken, deleteContestByUserId);

export default router;
