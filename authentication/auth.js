const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const jwtKey = process.env.JWT_SECRET || "testing";
const db = require("../data/models/usersModel.js");

module.exports = {
  createHash,
  checkHash,
  register,
  login,
  authenticate,
  authAllUsers
};

async function authAllUsers(req, res) {
  const token = req.get("authorize");
  if (token) {
    jwt.verify(token, jwtKey, (err, decoded) => {
      if (err) {
        res.status(401).json(err);
      }

      req.decoded = decoded;
    });
    try {
      if (req.decoded.username === "admin" && req.decoded.role === "admin") {
        const allUsers = await db.getUsers();
        res.status(200).json(allUsers);
      } else {
        res.status(400).json({ Error: "Unauthorized" });
      }
    } catch (err) {
      res.status(500).json(err);
    }
  }
}

async function authenticate(req, res, next) {
  const token = req.get("authorize");

  if (token) {
    jwt.verify(token, jwtKey, (err, decoded) => {
      if (err) {
        res.status(401).json(err);
      }

      req.decoded = decoded;
    });
    try {
      const user = await db.single_user(req.decoded.username);
      const { id } = req.params;
      if (req.decoded.id === Number(id)) {
        const theUser = { username: user.username };
        console.log(theUser);
        res.status(200).json(theUser);
      } else if (
        req.decoded.username === "admin" &&
        req.decoded.role === "admin"
      ) {
        const anotherUser = await db.single_user_by_id(req.params.id);
        res.status(200).json(anotherUser);
      } else {
        res.status(400).json({ Error: "Unauthorized" });
      }
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    return res.status(401).json({});
  }
}

async function createHash(pass, salt) {
  try {
    const newHash = await new Promise((res, rej) => {
      bcrypt.hash(pass, salt, function(err, hash) {
        if (err) rej(err);
        res(hash);
      });
    });
    return newHash;
  } catch (err) {
    console.log(err);
  }
}

async function checkHash(pass, userPass) {
  try {
    const loginCheck = await new Promise((res, rej) => {
      bcrypt.compare(pass, userPass, function(err, pass) {
        if (err) rej(err);
        res(pass);
      });
    });
    return loginCheck;
  } catch (err) {
    console.log(err);
  }
}

async function register(req, res) {
  const { username, password } = req.body;
  let creds = req.body;
  if (username && password) {
    try {
      const hash = await createHash(password, 10);
      creds.password = hash;
      const userCheck = await db.single_user(username);
      if (userCheck) {
        res.status(400).json({
          Error: "The username is alread taken. Please select another"
        });
      } else {
        const newUser = await db.add_user(creds);
        res.status(201).json(newUser);
      }
    } catch (err) {
      res.status(err);
    }
  } else {
    res.status(400).json({ Error: "The username and password are required" });
  }
}

async function login(req, res) {
  const { username, password } = req.body;
  const creds = req.body;
  if (username && password) {
    try {
      const user = await db.single_user(username);
      if (user) {
        const loginCheck = await checkHash(password, user.password);
        if (loginCheck === true) {
          const payload = {
            id: user.id,
            username: user.username,
            role: user.role
          };
          const options = {
            expiresIn: "1d"
          };
          const token = await jwt.sign(payload, jwtKey, options);
          res.status(200).json(token);
        } else {
          res.status(401).json({ Error: "Invalid Credentials" });
        }
      } else {
        res.status(401).json({ Error: "Invalid Credentials" });
      }
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(400).json({ Error: "The username and password are required" });
  }
}