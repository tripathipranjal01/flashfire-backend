// import express from 'express';
// import Routes from "./Routes.js";
// import Connection from './Utils/ConnectDB.js'
// import cors from 'cors'

//     const app = express();

//     app.use(express.json());
//     app.use(cors());
// //routes..
//     Routes(app);
// //connection to MongoDB..
//     Connection();

//     const PORT = 8086;
//     app.listen(PORT,()=>{
//         console.log('server is live at port :', PORT);
//     })


import express from 'express';
import Routes from './Routes.js';
import Connection from './Utils/ConnectDB.js';
import cors from 'cors';

const app = express();

app.use(express.json());
app.use(cors());

// Routes
Routes(app);

// Connect to MongoDB
Connection();

// ✅ Use Render's dynamic port
const PORT = process.env.PORT || 8086;
app.listen(PORT, () => {
  console.log('server is live at port :', PORT);
});
