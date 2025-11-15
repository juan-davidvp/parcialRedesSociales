const express = require("express"); //con esto Podemos inicializar nuestro server en NODE JS.
const app = express(); //Con esto nos aseguramos de encender el server en nuestra app.
const morgan = require('morgan'); 
const cors = require('cors');
const routes = require("./routes/routeMensajes")

const PORT = 3308 
//SE SETEA EL PUERTO 
app.set("port",PORT)
app.use(express.json())
app.use(cors());
app.use(morgan('dev'))



app.use("/redesSocial/mensajes",routes)

app.listen(PORT,()=>{
    console.log("app is listening port 3308")
})