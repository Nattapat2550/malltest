import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice'; // นำเข้า cartSlice

const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer, // เพิ่ม cart reducer เข้าไปในระบบ
  },
});

// กำหนด Type สำหรับนำไปใช้งานกับ useSelector และ useDispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;