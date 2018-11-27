import { Observable } from 'rxjs';
export declare class IpcService {
    constructor();
    send<T = any>(channel: string, eventName: any, ...args: any[]): Observable<T>;
}
