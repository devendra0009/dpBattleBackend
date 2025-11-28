import cloudinary from 'cloudinary';
import Contest from '../model/Contest.js';
import User from '../model/User.js';
import getDataUri from '../utils/fileUri.js';
import { getUserByUserEmail } from './userController.js';

// when user sees all the active contests
// ...existing code...
export const getAllContests = async (req, res) => {
  try {
    // pagination params
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '10', 10));
    const skip = (page - 1) * limit;

    // filters: status, type, user (user id belongs to user1 or user2), q (text search)
    const { status, type, user: userId, q } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (q) {
      // assuming contests have fields like title or description; adjust fields as needed
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }
    if (userId) {
      filter.$or = filter.$or || [];
      filter.$or.push({ user1: userId }, { user2: userId });
    }

    const totalCount = await Contest.countDocuments(filter);
    const contests = await Contest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.status(200).json({
      contests,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ msg: 'Internal server error' });
  }
};
// ...existing code...
// export const getAllContests = async (req, res) => {
//   try {
//     const contests = await Contest.find();
//     res.status(200).json({ contests: contests });
//   } catch (error) {
//     console.log('Error fetching contest:', error);
//     res.status(500).json({ msg: 'Internal server error' });
//   }
// };

// whenever a user clicks on a contest to see it/vote it -> then called to get full details of that contest
export const getContestByContestId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    // console.log(req.user);
    const contest = await Contest.findById(id);
    res.status(200).json({ contest: contest });
  } catch (error) {
    res.status(500).json({ msg: 'Internal server error' });
  }
};

// whenver user just creating a contest, he is alone and will fill only his details like u1 and img1
// user will be sending this in body { img1:"img", duration: "5m/1h/1d" }
export const createContest = async (req, res) => {
  const { id } = req.user;
  const { duration } = req.body; // i need to get off the image and convert it to link // this shouldn't be req.body it may be req.file or form , don't know
  try {
    // dummy -> convert the img -> link here
    const file = req.file;
    const fileUri = getDataUri(file);
    const myCloud = await cloudinary.v2.uploader.upload(fileUri.content);
    const imgLink = myCloud.secure_url;
    const contestDetails = {
      type: '1v1',
      status: 'matching',
      user1: id,
      img1: imgLink,
      user2: null,
      img2: '', // this is randomo person's img
      duration: duration,
    };
    const newContest = new Contest(contestDetails);
    const savedContest = await newContest.save();

    // whenever i created a contest, then put that contest id on the contest array of user who made it
    const updatedUser = await User.updateOne(
      { _id: savedContest.user1 },
      { $push: { contests: savedContest._id } }
    );
    if (updatedUser.modifiedCount === 0) {
      await Contest.deleteOne({ _id: savedContest._id });
      return res.status(400).json({ msg: "Issue with User, can't be updated" });
    }
    // console.log(savedContest);
    // automatically countdown start krde iska 
    await Contest.updateStatusAfterDuration(newContest._id);
    res.status(201).json({ contest: savedContest });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ msg: 'Internal Server Error!' });
  }
};

// this operation is performed by user2, so in req.body -> he'll send { img2:"img" } -> and we'll update the contest by id
// a edgeCase -> it may happen a user start battling with himself, therefore solutions: 1. when user click on joinContest having his own id, please do not allow him on the frontend directly by providing a check X
export const joinContest = async (req, res) => {
  try {
    const userId = req.user.id; // i had his id as the userB is already logged in
    const contestId = req.params.id;
    // const { img2 } = req.body;
    // here i had to perform 2 things -> first is to fill the entries of user2 and secondly update the status to fighting
    const file = req.file;
    const fileUri = getDataUri(file);
    const myCloud = await cloudinary.v2.uploader.upload(fileUri.content);
    const imgLink = myCloud.secure_url;

    const contestDetails = {
      status: 'fighting',
      user2: userId,
      img2: imgLink, // this is the image of random user who click on join contest button
      createdAt: Date.now(),
    };

    const updatedContest = await Contest.findOneAndUpdate(
      { _id: contestId },
      contestDetails,
      { new: true }
    );
    if (!updatedContest) {
      return res.status(404).json({ msg: 'Contest not found or not updated' });
    }
    // console.log(updatedContest);
    await Contest.updateStatusAfterDuration(updatedContest._id);
    res.status(200).json({ updatedContest: updatedContest });
  } catch (error) {
    res.status(500).json({ msg: 'Internal Server Error!' });
  }
};
export const createContestWithFriend = async (req, res) => {
  try {
    // we get the email of the registered userB as a idenitifier to find his id
    const { id } = req.user;
    const { user2Email, duration } = req.body;
    // console.log(req.body, "id",);
    const userByEmail = await User.findOne({ email: user2Email });
    // console.log(userByEmail);
    if (!userByEmail) {
      return res.status(404).json({ msg: 'User not found by this email!!' });
    }

    // upload images of you and friend
    const files = req.files;
    // console.log(files);
    const cloudPromises = files.map(async (file) => {
      const fileUri = getDataUri(file);
      const myCloud = await cloudinary.v2.uploader.upload(fileUri.content);
      return myCloud.secure_url;
    });
    const cloudUrls = await Promise.all(cloudPromises);

    // console.log(cloudUrls,"images contest with friend");

    const contestDetails = {
      type: '1v1',
      status: 'fighting',
      user1: id,
      img1: cloudUrls[0],
      user2: userByEmail._id,
      img2: cloudUrls[1],
      duration: duration,
    };
    const newContest = new Contest(contestDetails);
    const savedContest = await newContest.save();

    // when contest created succesffuly, to user related with that contest k contest array m is contest ki id dalde
    const updatedUserA = await User.updateOne(
      { _id: savedContest.user1 },
      { $push: { contests: savedContest._id } }
    );
    const updatedUserB = await User.updateOne(
      { _id: savedContest.user2 },
      { $push: { contests: savedContest._id } }
    );
    // agr user m contest array ko update krne m koi dikkt aagyi to contest ko bhi create mt krio
    if (updatedUserA.modifiedCount === 0 && updatedUserB.modifiedCount === 0) {
      await Contest.deleteOne({ _id: savedContest._id });
      await User.updateOne(
        { _id: savedContest.user1 },
        { $pull: { contests: savedContest._id } }
      );
      await User.updateOne(
        { _id: savedContest.user2 },
        { $pull: { contests: savedContest._id } }
      );
      return res
        .status(400)
        .json({ msg: "Issue with users, can't be updated" });
    }
    if (updatedUserA.modifiedCount === 0) {
      await Contest.deleteOne({ _id: savedContest._id });
      await User.updateOne(
        { _id: savedContest.user2 },
        { $pull: { contests: savedContest._id } }
      );
      return res
        .status(400)
        .json({ msg: "Issue with UserA, can't be updated" });
    }
    if (updatedUserB.modifiedCount === 0) {
      await Contest.deleteOne({ _id: savedContest._id });
      await User.updateOne(
        { _id: savedContest.user1 },
        { $pull: { contests: savedContest._id } }
      );
      return res
        .status(400)
        .json({ msg: "Issue with UserB, can't be updated" });
    }

    // console.log('after contest created', updatedUserA, updatedUserB);

    // console.log(savedContest);
    await Contest.updateStatusAfterDuration(savedContest._id);
    return res.status(201).json({ contest: savedContest });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Internal Server Error!' });
  }
};

// whenever i am fetching contest of a user
export const getContestByUserId = async (req, res) => {};

export const updateContest = async (req, res) => {
  // updating the vote
  try {
    const { contestId, winnerUser } = req.body; // Assuming winnerUser no. is provided

    // Fetch the contest by ID
    const contest = await Contest.findById(contestId);

    if (!contest) {
      return res.status(404).json({ msg: 'Contest not found' });
    }

    // Determine which user won and update votes accordingly
    if (winnerUser === 'one') {
      contest.votesU1 += 1;
    } else if (winnerUser === 'two') {
      contest.votesU2 += 1;
    } else {
      return res.status(400).json({ msg: 'No 3rd user!!' });
    }

    // Update the contest with new vote counts
    const updatedContest = await contest.save();
    return res.status(201).json({ updatedContest: updatedContest });
  } catch (error) {
    return res.status(500).json({ msg: 'Internal Server Error!' });
  }
};

export const deleteContestByContestId = async (req, res) => {};

// using this a user can delte a contest started by him -> no but user can't delte the contest by himself: onyl admin can do this
export const deleteContestByUserId = async (req, res) => {};
