const express=require('express')

const app=express()

require('dotenv').config()


const port=5000

 const solarmanrouter=require('./solarmanrouter')

 app.use(solarmanrouter)

app.listen(port,()=>{
    console.log("server running")
})