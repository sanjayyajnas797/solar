import {createSlice,createAsyncThunk} from '@reduxjs/toolkit'
import API_BASE from '../pages/config'
const initialState={
    list:[]
}

export const fetchdata=createAsyncThunk(
    "cloud/data",
    async()=>{
        try{
                 const res=await fetch(`${API_BASE}/sub-buildings`);
                 const data=await res.json()
                 return data
        }catch(error){
             console.log(error)
        }
    }
)

export const userslice=createSlice({
    name:"cloud",
    initialState,
    reducers:{},
    extraReducers:(build)=>{
        build
        .addCase(fetchdata.fulfilled,(state,action)=>{
            state.list=action.payload
        })
        
    }
})

export default userslice.reducer