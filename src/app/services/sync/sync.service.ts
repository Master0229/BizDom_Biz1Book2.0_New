import { Injectable } from '@angular/core'
import { AuthService } from 'src/app/auth.service'

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  cansaveorder = true
  pendingorders: any = []
  constructor(private auth: AuthService) {}
  sync() {
    if (this.cansaveorder) this.getorders()
  }
  getorders() {
    if (navigator.onLine) {
      if (this.pendingorders.length == 0) {
        this.cansaveorder = false
        this.auth.getorders().subscribe(data => {
          this.pendingorders = data
          if (this.pendingorders.length > 0) this.saveorders()
          else this.cansaveorder = true
        })
      } else {
        this.saveorders()
      }
    } else {
      setTimeout(() => {
        this.getorders()
      }, 30000)
    }
  }
  saveorders() {
    var order = this.pendingorders.shift()
    this.auth.saveorder({ OrderJson: JSON.stringify(order) }).subscribe(
      data => {
        if (data['status'] == 200 || data['status'] == 409) {
          this.auth.deleteorderfromnedb(order._id).subscribe(ddata => {
            this.getorders()
          })
        } else {
          this.getorders()
        }
      },
      error => {
        this.getorders()
      },
    )
  }
}
