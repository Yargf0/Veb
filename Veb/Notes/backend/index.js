require("dotenv").config();

const config = require("./config.json");
const mongoose = require("mongoose");

mongoose.connect(config.connectionString);

const User = require("./models/user.model");
const Note = require("./models/note.model");


const express = require("express");
const cors = require("cors");
const app = express();

const jwt = require("jsonwebtoken");
const {authenticateToken} = require("./utilities")

app.use(express.json());

app.use(
    cors({
        origin: "*",
    })
);

app.get("/",(req, res) => {
    res.json({ data: "hello"})
});

//Add user
app.post("/create-account", async (req,res)=>{
    const {fullName,email,password} = req.body;

    if(!fullName){
        return res
        .status(400)
        .json({error:true, message:"Необходимо имя!"});
    }
    if(!email){
        return res
        .status(400)
        .json({error:true, message:"Необходима электронная почта!"});
    }
    if(!password){
        return res
        .status(400)
        .json({error:true, message:"Необходим пароль!"});
    }

    const isUser = await User.findOne({email:email});

    if(isUser){
        return res.json({
            error:true,
            message:"Пользователь уже существует",
        });
    }
    const user = new User({
        fullName,
        email,
        password,
    });

    await user.save();

    const accessToken = jwt.sign({user},process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:"3600m",
    });
    
    return res.json({
        error:false,
        user,
        accessToken,
        message:"Регистрация успешно завершена",
    });
})

//login
app.post("/login", async (req,res) => {
    const { email, password } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Необходима электронная почта" });
    }

    if (!password) {
        return res.status(400).json({ message: "Необходим пароль" });
    }

    const userInfo = await User.findOne({ email: email });

    if (!userInfo) {
        return res.status(400).json({ message: "Пользователь не найден"});
    }

    if (userInfo.email == email && userInfo.password == password) {
        const user = { user: userInfo };
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
            expiresIn: "36000m",
        });

        return res.json({
            error: false,
            message: "Вход выполнен",
            email,
            accessToken,
        });
    } else {
        return res.sendStatus(400).json({
            error: true,
            message: "Неверные данные"
        });
    }
});

// Add Note
app.post("/add-note", authenticateToken, async (req, res) => {
    const { title, content, tags} = req.body;
    const { user } = req.user;

    if (!title) {
        return res.status(400).json({ error: true, message: "Необходим заголовок" });
    }

    if (!content) {
        return res
            .status(400)
            .json({ error: true, message: "Нужно наполнение"});
    }

    try {
        const note = new Note({
            title,
            content,
            tags: tags || [],
            userId: user._id,
        });

        await note.save();

        return res.json({
            error: false,
            note,
            message: "Запись успешно добавлена",
        });
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: "Ошибка внутреннего сервера",
        });
    }
});

app.listen(8000);

module.exports = app;