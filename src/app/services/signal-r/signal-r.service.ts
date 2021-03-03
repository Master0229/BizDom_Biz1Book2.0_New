import { Injectable } from '@angular/core'
import * as signalR from '@aspnet/signalr' // or from "@microsoft/signalr" if you are using a new library
import { AuthService } from 'src/app/auth.service'

@Injectable({
  providedIn: 'root',
})
export class SignalRService {
  public hubConnection: signalR.HubConnection = new signalR.HubConnectionBuilder()
    .withUrl('https://biz1pos.azurewebsites.net/chatHub')
    .build()
  public hubRoom: string = ''
  public StoreId: number = 0
  public CompanyId: number = 0
  public isconnected: boolean = false
  public loginfo: any = null
  constructor(private auth: AuthService) {}

  public startConnection = loginfo => {
    this.CompanyId = loginfo.CompanyId
    this.StoreId = loginfo.StoreId
    this.hubRoom = this.StoreId.toString() + '/' + this.CompanyId.toString()
    this.hubConnection.onclose(reason => {
      this.isconnected = false
      this.startConnection(this.loginfo)
    })

    this.hubConnection.on('joinmessage', data => {
      console.log(data)
      this.hubConnection.invoke('GetStoreOrders', this.hubRoom, this.StoreId)
    })

    this.hubConnection
      .start()
      .then(() => {
        console.log('Connection started', this.hubConnection.state)
        this.isconnected = true
        this.hubConnection.invoke('JoinRoom', this.hubRoom, this.StoreId)
      })
      .catch(err => {
        console.log('Error while starting connection: ' + err)
        this.isconnected = false
      })
  }

  // public setconfig = () => {
  // }
  // public addTransferChartDataListener = () => {
  //   this.hubConnection.on('transferchartdata', (data) => {
  //     this.data = data;
  //     console.log(data);
  //   });
  // }
}
