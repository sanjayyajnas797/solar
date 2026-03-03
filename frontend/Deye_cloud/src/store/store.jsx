import {configureStore} from '@reduxjs/toolkit'
import userReducer from './createslice'
const store=configureStore({
    reducer:{
        userinfo:userReducer
    }
})
export default store