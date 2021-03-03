import { Injectable } from '@angular/core'
import { ElectronService } from 'ngx-electron'

@Injectable({
  providedIn: 'root',
})
export class PrintService {
  constructor(private electronService: ElectronService) {}
  print(html, printer) {
    if (this.electronService.isElectronApp)
      this.electronService.remote.getGlobal('testPrint')(1, printer, html)
  }
}
