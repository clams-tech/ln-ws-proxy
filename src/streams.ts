import { BehaviorSubject, Subject } from 'rxjs'

export const webSocketDrain$ = new Subject<number>()
export const connections$ = new BehaviorSubject(0)
