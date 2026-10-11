import {describe,it,expect} from 'vitest';
import {classifyFcm,safeNotificationPath} from '../../../supabase/functions/send-native-push/policy';
describe('FCM delivery policy',()=>{
 it('accepts confirmed provider success',()=>expect(classifyFcm(200,{})).toBe('sent'));
 it.each([429,500,503])('retries transient %s',status=>expect(classifyFcm(status,{})).toBe('retry'));
 it('does not delete tokens for credentials or malformed payloads',()=>{expect(classifyFcm(401,{})).toBe('failed');expect(classifyFcm(400,{error:{status:'INVALID_ARGUMENT'}})).toBe('failed');});
 it('only invalidates a token explicitly rejected as unregistered',()=>expect(classifyFcm(404,{error:{details:[{'@type':'type.googleapis.com/google.firebase.fcm.v1.FcmError',errorCode:'UNREGISTERED'}]}})).toBe('unregistered'));
 it('preserves transaction destination',()=>expect(safeNotificationPath('/dashboard/transactions?id=123')).toBe('/dashboard/transactions?id=123'));
 it.each(['https://evil.test','//evil.test','javascript:alert(1)','https://vendibook.com.evil.test','/%2f%2fevil.test'])('rejects unsafe destination %s',url=>expect(safeNotificationPath(url)).toBe('/dashboard'));
});
