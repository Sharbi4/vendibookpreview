import {useEffect,useSyncExternalStore} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import {setNativePushAccount,nativePushSnapshot,observeNativePush,nativePushSupported,enableNativePush,disableNativePush} from '@/lib/native/push';
export function NativePushLifecycle(){
 const {user,isLoading}=useAuth();const navigate=useNavigate();
 useEffect(()=>{if(!isLoading)void setNativePushAccount(user?.id,navigate).catch(()=>{});},[user?.id,isLoading,navigate]);
 return null;
}
export function useNativePushNotifications(){
 const state=useSyncExternalStore(observeNativePush,nativePushSnapshot,nativePushSnapshot);
 return {...state,isSupported:nativePushSupported(),subscribe:enableNativePush,unsubscribe:disableNativePush};
}
