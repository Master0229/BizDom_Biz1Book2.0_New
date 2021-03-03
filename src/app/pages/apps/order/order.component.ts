import { Component, ElementRef, OnInit, TemplateRef, ViewChild } from '@angular/core'
import { OrderModule, OrderItemModule, CurrentItemModule, KOTModule } from './order.moduel'
import { NgbModal, ModalDismissReasons, NgbTypeahead } from '@ng-bootstrap/ng-bootstrap'
import { AuthService } from '../../../auth.service'
import { NzModalService } from 'ng-zorro-antd/modal'
import * as _ from 'lodash'
import { ElectronService } from 'ngx-electron'
import { SignalRService } from '../../../services/signal-r/signal-r.service'
import { merge, Observable, Subject } from 'rxjs'
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators'
import { PrintService } from 'src/app/services/print/print.service'
import * as moment from 'moment'
import { SyncService } from 'src/app/services/sync/sync.service'
@Component({
  selector: 'app-order',
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss'],
})
export class OrderComponent implements OnInit {
  // Autocomplete
  @ViewChild('quantityref', { static: false }) private QuantityRef: ElementRef
  @ViewChild('instance', { static: true }) instance: NgbTypeahead
  @ViewChild('au', { static: true }) autocompleteref: ElementRef
  focus$ = new Subject<string>()
  click$ = new Subject<string>()
  // Take Away Filter
  takawayinput: string
  // Date Picker Take Away
  dateRange = []

  // Drawer Take Away
  visible = false

  // Auto complete+
  inputValue: string
  options: string[] = []
  // Modal for Order edit
  isVisible = false
  // Dine In Select Table
  listOfOption: Array<{ label: string; value: string }> = []
  size = 'default'
  selectedValue = 'gf'
  // OLD POS Auto Complete
  autocompletevalidation: boolean = true
  typeheadSelected: any
  public model: any = ''
  // OLD POS ITEM
  item: any = []
  // OLD POS
  KOTNo: any
  locKOTNo: any
  paymentTypes: any = []
  order: OrderModule
  categories: any = []
  parentcategories = []
  childcategories = []
  nodesFiles = [
    {
      title: 'All',
      key: '100',
      expanded: false,
    },
  ]
  onlinestatusid = [-1]
  activeKey = 0
  products: any = []
  selectedcategoryid = 0
  public show: boolean = false
  public buttonName: any = 'Back'
  autocompleteproducts = []
  hide = true
  cards = [
    { name: 'Quick Order', ordertypeid: 5, class: 'bg-success', icon: 'fe fe-zap' },
    { name: 'Dine In', ordertypeid: 1, class: 'bg-primary', icon: 'fa fa-cutlery' },
    { name: 'Take Away', ordertypeid: 2, class: 'bg-warning', icon: 'fe fe-briefcase' },
    { name: 'Delivery', ordertypeid: 3, class: 'bg-gray-6', icon: 'fa fa-send-o' },
    { name: 'Pick Up', ordertypeid: 4, class: 'bg-red', icon: 'fa fa-truck' },
    { name: 'Online Orders', ordertypeid: 6, class: 'bg-dark', icon: 'fe fe-globe' },
  ]
  orderpageid = 0
  sectionid = 0
  orderkey = { orderno: 1, kotno: 1, timestamp: 0, GSTno: '' }

  // Online Orders
  onlineorders: any = []
  onlineorderscount = {
    placed: 0,
    inprogress: 0,
    completed: 0,
    cancelled: 0,
  }
  cancellationmessage = ''
  cancelreasons = [
    { id: 1, message: 'item_out_of_stock' },
    { id: 2, message: 'store_closed' },
    { id: 3, message: 'store_busy' },
    { id: 4, message: 'rider_not_available' },
    { id: 5, message: 'out_of_delivery_radius' },
    { id: 6, message: 'connectivity_issue' },
    { id: 7, message: 'total_missmatch' },
    { id: 8, message: 'invalid_item' },
    { id: 9, message: 'option_out_of_stock' },
    { id: 10, message: 'invalid_option' },
    { id: 11, message: 'unspecified' },
  ]
  cancelreason = { id: 1, message: 'item_out_of_stock' }
  tempkotobj = null
  charges = []
  diningareas = []
  diningtables = []
  loginfo
  printersettings = { receiptprinter: '', kotprinter: '' }
  printhtmlstyle = `
  <style>
    #printelement {
      width: 270px;
    }
    .header {
        text-align: center;
    }
    .item-table {
        width: 100%;
    }
    .text-right {
      text-align: right!important;
    }
    .text-left {
      text-align: left!important;
    }
    .text-center {
      text-align: center!important;
    }
    tr.nb, thead.nb {
        border-top: 0px;
        border-bottom: 0px;
    }
    table, p, h3 {
      empty-cells: inherit;
      font-family: Helvetica;
      font-size: small;
      width: 290px;
      padding-left: 0px;
      border-collapse: collapse;
    }
    table, tr, td {
      border-bottom: 0;
    }
    hr {
      border-top: 1px dashed black;
    }
    tr.bt {
      border-top: 1px dashed black;
      border-bottom: 0px;
    }
    tr {
      padding-top: -5px;
    }
  </style>`
  constructor(
    private modalService: NgbModal,
    private auth: AuthService,
    private modalService1: NzModalService, // private electronservice: ElectronService,
    private signal_r: SignalRService,
    private printservice: PrintService,
    private sync: SyncService,
  ) {}
  currentfloor = { name: 'Loading...', id: 0 }
  ngOnInit(): void {
    // this.getcategories()
    // this.getproducts()
    // this.getPaymentTypes()
    this.getdata()
    this.setsignalrconfig()
    this.sync.sync()
  }
  changeKey(key) {
    this.activeKey = key
  }
  getdata() {
    this.auth
      .getdbdata([
        'product',
        'category',
        'orderkey',
        'paymenttypes',
        'additionalcharges',
        'loginfo',
        'printersettings',
        'diningarea',
        'diningtable',
      ])
      .subscribe(data => {
        console.log(data)
        this.paymentTypes = data['paymenttypes']
        this.products = data['product']
        this.categories = data['category']
        this.charges = data['additionalcharges']
        this.loginfo = data['loginfo'][0]
        this.orderkey = data['orderkey'][0]
        this.printersettings = data['printersettings'][0]
        this.diningareas = data['diningarea']
        this.diningtables = data['diningtable']
        this.currentfloor.name = this.diningareas[0].DiningArea
        this.currentfloor.id = this.diningareas[0].Id
        var todate = new Date().getDate()
        var orderkeydate = new Date(this.orderkey.timestamp).getDate()
        if (orderkeydate != todate) {
          console.log('new day!')
          this.orderkey.kotno = 1
          this.orderkey.orderno = 1
          this.orderkey.timestamp = new Date().getTime()
          this.auth.updateorderkey(this.orderkey).subscribe(d => {})
        }
        this.parentcategories = this.categories.filter(x => x.ParentId == 0)
        this.childcategories = this.categories.filter(x => x.ParentId != 0)
      })
  }
  setpayment(paymenttypeid) {
    this.order.StorePaymentTypeId = paymenttypeid
    this.order.PaidAmount = this.order.BillAmount
    console.log(paymenttypeid, this.order)
  }
  //Hide and Show toggle
  getcategories() {
    // this.categories = JSON.parse(localStorage.getItem('Category'))
    this.auth.getcategories().subscribe(data => {
      this.categories = data
      this.parentcategories = this.categories.filter(x => x.ParentId == 0)
      this.childcategories = this.categories.filter(x => x.ParentId != 0)
    })
  }
  getproducts() {
    // this.products = JSON.parse(localStorage.getItem('Product'))

    this.auth.getproducts().subscribe(data => {
      this.products = data
    })
  }
  toggle() {
    this.show = !this.show
    if (this.show) this.buttonName = 'Back'
    else this.buttonName = 'Back'
  }

  createorder(ordertypeid) {
    this.order = new OrderModule(ordertypeid)
    this.show = false
    this.sectionid = 2
  }

  // Option Group
  @ViewChild('prod_details', { static: false }) public prod_detail_modal: TemplateRef<any>
  @ViewChild('cancelreason_modal', { static: false }) public cancelreason_modal: TemplateRef<any>
  @ViewChild('viewonlineorder_modal', { static: false }) public viewonlineorder_modal: TemplateRef<
    any
  >

  currentitem: OrderItemModule = null
  addProduct(product) {
    var options = {
      quantity: 1,
      key: '',
    }
    if (product.OptionGroup && product.OptionGroup.length > 0) {
      this.currentitem = new CurrentItemModule(product)
      this.modalService.open(this.prod_detail_modal, { centered: true })
    } else {
      this.order.additem(product, options)
      this.model = ''
      this.QuantityRef['nativeElement'].value = ''
      this.instance['_elementRef']['nativeElement'].focus()
    }
  }
  addcurrentitem() {
    var options = {
      quantity: this.currentitem.Quantity,
      key: '',
    }
    this.order.additem(this.currentitem, options)
    this.model = ''
    this.QuantityRef['nativeElement'].value = ''
    this.instance['_elementRef']['nativeElement'].focus()
    this.modalService.dismissAll()
  }
  console() {
    console.log('qqqqqqqqqqqqq')
  }
  itemdetails(product) {
    this.currentitem = new CurrentItemModule(product)
    this.modalService.open(this.prod_detail_modal, { centered: true })
  }

  setvariantvalue(OptionGroup, Option) {
    OptionGroup.Option.forEach(element => {
      element.selected = false
    })
    if (OptionGroup.selected != Option.Id) {
      OptionGroup.selected = Option.Id
      Option.selected = true
    } else {
      OptionGroup.selected = false
      Option.selected = false
    }
    this.setcurrentitemprice()
  }
  setcurrentitemprice() {
    this.currentitem.TotalAmount = 0
    this.currentitem.OptionGroup.forEach(opg => {
      if (opg.selected) {
        opg.Option.forEach(option => {
          if (option.selected) {
            this.currentitem.TotalAmount += option.Price
          }
        })
      }
    })
    this.currentitem.TotalAmount += this.currentitem.Price
    this.currentitem.TotalAmount *= this.currentitem.Quantity
    if (this.currentitem.DiscType == 1) {
      this.currentitem.TotalAmount -= this.currentitem.DiscAmount
    } else if (this.currentitem.DiscType == 2) {
      this.currentitem.TotalAmount -=
        (this.currentitem.TotalAmount * this.currentitem.DiscPercent) / 100
    }
  }
  SetAddonValue(OptionGroup, Option, check) {
    if (check) {
      Option.selected = true
    } else {
      Option.selected = false
    }
    if (OptionGroup.Option.some(x => x.selected == true)) {
      OptionGroup.selected = true
    } else {
      OptionGroup.selected = false
    }
    this.setcurrentitemprice()
  }
  nzClick(event) {
    console.log(event)
  }
  openCustomClass(content) {
    this.modalService.open(content, { centered: true, windowClass: 'modal-holder' })
  }

  // Auto Compelete

  onInput(value: string): void {
    this.autocompleteproducts = value
      ? this.products.filter(x => x.Product.toLowerCase().includes(value.toLowerCase()))
      : []
  }

  addItem(contentDetail, productObj, qty: number) {
    // mintos();
    // this.getPaymentTypes();
    if (this.order.OrderTypeId == 5) {
      this.order.PaidAmount = 0
    }
    productObj.KOTNo = this.KOTNo
  }
  fieldselect(event) {
    // alert('hi');
    console.log(event)
    console.log(event.element.nativeElement.id)
    var product = this.products.filter(x => x.Id == +event.element.nativeElement.id)[0]
  }
  getPaymentTypes() {
    // console.log("getpaymanet");
    // this.paymentType = JSON.parse(localStorage.getItem("PaymentType"));
    // this.paymentType.forEach(element => {
    //   element.Price = 0;
    // });
    // this.IDB.IDBGetStoreObser("PaymentType").subscribe(data => {
    //   this.paymentType = data;
    //   this.paymentType.forEach(element => {
    //     element.Price = 0;
    //   });
    // });
  }

  // Modal for Edit Order
  // Bootstrap
  open(content) {
    this.modalService.open(content)
  }
  vieworderlist(type) {
    this.sectionid = 1
    this.orderpageid = type
    if (type == 6) {
      this.getonlineorders()
    }
  }
  updateorderno() {
    this.orderkey.orderno++
    this.auth.updateorderkey(this.orderkey).subscribe(data => {})
  }
  updatekotno() {
    this.orderkey.kotno++
    this.auth.updateorderkey(this.orderkey).subscribe(data => {})
  }
  addfreequantity(key) {
    this.order.Items.forEach(item => {
      if (item.ProductKey == key) {
        if (item.Quantity > 0) {
          item.Quantity--
          item.ComplementryQty++
        }
      }
    })
    this.order.setbillamount()
  }
  onLongPress() {
    console.log('long press')
  }
  onLongPressing() {
    console.log('long press ing')
  }
  generatekot() {
    var groupeditems = _.mapValues(
      _.groupBy(
        this.order.Items.filter(x => x.Quantity + x.ComplementryQty - x.kotquantity != 0),
        'KOTGroupId',
      ),
    )

    // console.log(groupeditems)

    Object.keys(groupeditems).forEach(key => {
      this.order.addkot(groupeditems[key], this.orderkey.kotno)
      this.updatekotno()
    })
    if (this.order.OrderNo == 0) {
      this.order.OrderNo = this.orderkey.orderno
      this.updateorderno()
    }
    this.order.Items = this.order.Items.filter(x => x.Quantity + x.ComplementryQty != 0)
    // console.log(this.order)
    // console.log(JSON.stringify(this.order))
    localStorage.setItem('testorder', JSON.stringify(this.order))
    this.order.KOTS.forEach(kot => {
      if (!kot.isprinted) {
        this.tempkotobj = kot
        kot.isprinted = true
        // this.printkot(kot)
      }
    })
  }
  printkot(kot: KOTModule) {
    var kottemplate = `
    <div id="printelement">
      <div class="header">
          <h3>ORDER TICKET #${kot.KOTNo}</h3>
          <table class="item-table">
              <tbody>
                  <tr class="nb">
                      <td class="text-left">${this.order.InvoiceNo}</td>
                      <td class="text-right">${this.order.OrderName}</td>
                  </tr>
                  <tr class="nb">
                      <td class="text-left">Time</td>
                      <td class="text-right">${kot.ModifiedDate}</td>
                  </tr>
              </tbody>
          </table>
      </div>
      <hr>`
    if (kot.added.length > 0) {
      kottemplate += `
      <div class="text-center">ADDED ITEMS</div>
      <table class="item-table">
          <thead class="nb">
              <th class="text-left">ITEM</th>
              <th class="text-right">QTY</th>
          </thead>
          <tbody>
      `
      kot.added.forEach(ai => {
        kottemplate += `
        <tr class="nb">
            <td class="text-left">${ai.showname}</td>
            <td class="text-right">+${ai.Quantity}</td>
        </tr>
      `
      })
      kottemplate += `
        </tbody>
      </table>
      <hr>
      `
    }
    if (kot.removed.length > 0) {
      kottemplate += `
      <div class="text-center">REMOVED ITEMS</div>
      <table class="item-table">
          <thead class="nb">
              <th class="text-left">ITEM</th>
              <th class="text-right">QTY</th>
          </thead>
          <tbody>
      `
      kot.removed.forEach(ri => {
        kottemplate += `
        <tr class="nb">
            <td class="text-left">${ri.showname}</td>
            <td class="text-right">${ri.Quantity}</td>
        </tr>
      `
      })
      kottemplate += `
        </tbody>
      </table>
      <hr>
      `
    }
    kottemplate += `
      <div class="text-center">
          <p>Powered By Biz1Book.</p>
      </div>
    </div>
    `
    kottemplate += this.printhtmlstyle
    console.log(kottemplate)
    if (this.printersettings) this.printservice.print(kottemplate, this.printersettings.kotprinter)
  }

  // Take Away Button Text CHange Function
  users: Array<any> = [
    {
      active: false,
    },
  ]

  click(user) {
    user.active = !user.active
  }
  printreceipt() {
    var printtemplate = `
    <div id="printelement">
    <div class="header">
        <h3>FB CakeHouse</h3>
        <p>
            ${this.loginfo.Store}, ${this.loginfo.Address}<br>
            ${this.loginfo.City}, ${this.loginfo.ContactNo}
            GSTIN:${this.orderkey.GSTno}<br>
            Receipt: ${this.order.InvoiceNo}<br>
            ${moment(this.order.OrderedDateTime).format('LLL')}
        </p>
    </div>
    <hr>
    <table class="item-table">
        <thead class="nb">
            <th class="text-left" style="width: 100px;">ITEM</th>
            <th class="text-right">PRICE</th>
            <th class="text-right">QTY</th>
            <th class="text-right">AMOUNT</th>
        </thead>
        <tbody>`
    this.order.Items.forEach(item => {
      printtemplate += `
      <tr class="nb">
          <td class="text-left">${item.showname}</td>
          <td class="text-right">${item.baseprice.toFixed(2)}</td>
          <td class="text-right">${item.Quantity}${
        item.ComplementryQty > 0 ? '(' + item.ComplementryQty + ')' : ''
      }</td>
          <td class="text-right">${item.TotalAmount.toFixed(2)}</td>
      </tr>`
    })
    printtemplate += `
    <tr class="bt">
        <td class="text-left"><strong>Sub Total</strong></td>
        <td colspan="2"></td>
        <td class="text-right">${this.order.subtotal.toFixed(2)}</td>
    </tr>
    <tr class="nb" ${this.order.OrderTotDisc + this.order.AllItemTotalDisc == 0 ? 'hidden' : ''}>
        <td class="text-left"><strong>Discount</strong></td>
        <td colspan="2"></td>
        <td class="text-right">${(this.order.OrderTotDisc + this.order.AllItemTotalDisc).toFixed(
          2,
        )}</td>
    </tr>
    <tr class="nb" ${this.order.Tax1 == 0 ? 'hidden' : ''}>
        <td class="text-left"><strong>CGST</strong></td>
        <td colspan="2"></td>
        <td class="text-right">${this.order.Tax1.toFixed(2)}</td>
    </tr>
    <tr class="nb" ${this.order.Tax2 == 0 ? 'hidden' : ''}>
        <td class="text-left"><strong>SGST</strong></td>
        <td colspan="2"></td>
        <td class="text-right">${this.order.Tax2.toFixed(2)}</td>
    </tr>`
    this.order.additionalchargearray.forEach(charge => {
      printtemplate += `
          <tr class="nb">
              <td class="text-left"><strong>${charge.title}</strong></td>
              <td colspan="2"></td>
              <td class="text-right">${charge.value}</td>
          </tr>`
    })
    printtemplate += `
          <tr class="nb">
              <td class="text-left"><strong>Paid</strong></td>
              <td colspan="2"></td>
              <td class="text-right">${this.order.PaidAmount.toFixed(2)}</td>
          </tr>
          <tr class="nb">
              <td class="text-left"><strong>Total</strong></td>
              <td colspan="2"></td>
              <td class="text-right">${this.order.BillAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <hr>
      <div class="text-center">
        <p>Powered By Biz1Book.</p>
      </div>
    </div>`
    printtemplate += this.printhtmlstyle
    console.log(printtemplate)
    // var printhtml = document.getElementById("rprintelcontainer").innerHTML
    // printhtml += this.printhtmlstyle
    // console.log(printhtml)
    if (this.printersettings) {
      this.printservice.print(printtemplate, this.printersettings.receiptprinter)
    }
  }
  saveorder() {
    this.generatekot()
    this.order.BillDateTime = moment().format('YYYY-MM-DD HH:mm:ss')
    this.order.BillDate = moment().format('YYYY-MM-DD')
    this.order.OrderedDateTime = moment().format('YYYY-MM-DD HH:mm:ss')
    this.order.OrderedDate = moment().format('YYYY-MM-DD')
    this.order.UserId = null
    this.order.StoreId = this.loginfo.StoreId
    this.order.CompanyId = this.loginfo.CompanyId
    this.order.OrderStatusId = 5
    this.order.InvoiceNo =
      this.loginfo.StoreId + moment().format('YYYYMMDD') + '/' + this.order.OrderNo
    this.printreceipt()
    this.order.setrefid()
    this.auth.saveordertonedb(this.order).subscribe(data => {
      console.log(data)
      this.sync.sync()
      console.log(this.order)
      this.clearorder(this.order.OrderTypeId)
    })
  }
  print() {
    var printhtml = document.getElementById('kprintelcontainer').innerHTML
    console.log(printhtml)
  }
  grouparray(id) {
    console.log('qwerty')
    this.viewonlineorder(id)
    // var grouped = _.mapValues(_.groupBy(this.cars, 'make'))

    // console.log(grouped)
  }
  clearorder(typeid) {
    this.order = null
    if (typeid == 5) this.createorder(typeid)
  }
  modalclose() {
    this.modalService.dismissAll()
  }

  // Online Order page BUtton text change function
  onlineusers: Array<any> = [
    {
      onlineactive: false,
    },
  ]

  onlineclick(onlineuser) {
    onlineuser.onlineactive = !onlineuser.onlineactive
  }

  // Autocomplete
  ////////////////////////typehead search////////////////////////
  acselectedpd: any
  search = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      map(term =>
        term === ''
          ? []
          : this.products
              .filter(v => v.Product.toLowerCase().indexOf(term.toLowerCase()) > -1)
              .slice(0, 10),
      ),
    )

  formatter = (x: { Product: string }) => x.Product
  selectedItem(item) {
    console.log(item)
    if (item.hasOwnProperty('OptionGroup')) {
      this.addProduct(item)
    } else {
      this.acselectedpd = item
      this.QuantityRef['nativeElement'].focus()
    }
  }
  addproductbyautocomplete() {
    if (this.QuantityRef['nativeElement'].value) {
      var options = {
        quantity: +this.QuantityRef['nativeElement'].value,
        key: '',
      }
      this.order.additem(this.acselectedpd, options)
      this.model = ''
      this.QuantityRef['nativeElement'].value = ''
      this.instance['_elementRef']['nativeElement'].focus()
    }
  }
  getprintersetting() {
    this.auth.getdbdata(['printersettings']).subscribe(data => {
      this.printersettings = data['printersettings'][0] ? data['printersettings'][0] : {}
    })
  }

  // Online Order modal
  // @ViewChild('cancelreason_modal', { static: false }) public cancelreason_modal: TemplateRef<any>
  // @ViewChild('viewonlineorder_modal', { static: false }) public viewonlineorder_modal: TemplateRef<
  //   any
  // >

  //////////////////////////////////////Signal-R//////////////////////////////////////
  private hubRoom: string = '4/3'
  private StoreId: number = 4
  private filteredonlineorders: any = []
  setsignalrconfig() {
    this.signal_r.hubConnection.on('order', data => {
      this.onlineorderscount = {
        placed: 0,
        inprogress: 0,
        completed: 0,
        cancelled: 0,
      }
      this.onlineorders = data
      this.onlineorders.forEach((order, index) => {
        order.order_details = JSON.parse(order.json)
        order.rider_details = JSON.parse(order.riderDetails)
        order.status_details = JSON.parse(order.acceptedTimeStamp)
        if (order.orderStatusId == 0) this.onlineorderscount.placed++
        if ([1, 3, 4].includes(order.orderStatusId)) this.onlineorderscount.inprogress++
        if (order.orderStatusId == 5) this.onlineorderscount.completed++
        if (order.orderStatusId == -1) this.onlineorderscount.cancelled++
      })
      this.filteronlineorders()
      console.log(this.onlineorders)
    })
  }
  getonlineorders() {
    console.log(this.signal_r.isconnected, 'invoking order event')
    if (this.signal_r.isconnected) {
      this.signal_r.hubConnection.invoke('GetStoreOrders', this.hubRoom, this.StoreId)
    }
  }
  filteronlineorders() {
    this.onlineorderscount = {
      placed: 0,
      inprogress: 0,
      completed: 0,
      cancelled: 0,
    }
    this.onlineorders.forEach((order, index) => {
      // order.order_details = JSON.parse(order.json)
      // order.rider_details = JSON.parse(order.riderDetails)
      // order.status_details = JSON.parse(order.acceptedTimeStamp)
      if (order.orderStatusId == 0) this.onlineorderscount.placed++
      if ([1, 3, 4].includes(order.orderStatusId)) this.onlineorderscount.inprogress++
      if (order.orderStatusId == 5) this.onlineorderscount.completed++
      if (order.orderStatusId == -1) this.onlineorderscount.cancelled++
    })
    this.filteredonlineorders = this.onlineorders.filter(x =>
      this.onlinestatusid.includes(x.orderStatusId),
    )
  }

  onlineorderstatuschange(orderid, statusid) {
    var statusdata = {
      new_status: '',
      message: '',
    }
    if (statusid == 1) {
      statusdata.new_status = 'Acknowledged'
      statusdata.message = 'Order Accepted from restaurant'
    } else if (statusid == 3) {
      statusdata.new_status = 'Food Ready'
      statusdata.message = 'Food prepared @Restaurant'
    } else if (statusid == 4) {
      statusdata.new_status = 'Dispatched'
      statusdata.message = 'Driver picked up the order'
    } else if (statusid == 5) {
      statusdata.new_status = 'Completed'
      statusdata.message = 'Order delivered to customer'
    } else if (statusid == -1) {
      statusdata.new_status = 'Cancelled'
      statusdata.message = this.cancelreason.message
    }
    if (statusid == 1) {
      this.temponlineorder = this.onlineorders.filter(x => x.upOrderId == orderid)[0]
      this.temponlineorder.invoiceno =
        this.temponlineorder.order_details.order.details.channel.charAt(0).toUpperCase() +
        this.temponlineorder.order_details.order.details.ext_platforms[0].id
      this.temponlineorder.order_details.order.items.forEach(item => {
        item.baseprice = item.price
        item.showname = item.title
        item.options_to_add.forEach(option => {
          item.baseprice += option.price
          item.showname += '/' + option.title
        })
      })
      this.printonlineorderreceipt()
      this.printonlineorderkot()
    }

    this.auth
      .UPOrderStatusChange(orderid, JSON.stringify(statusdata), statusid, 4, 3)
      .subscribe(data => {
        console.log(data)
        this.getonlineorders()
        this.onlineorders.filter(x => x.upOrderId == orderid)[0].orderStatusId = statusid
        this.filteronlineorders()
      })
  }
  temponlineorder
  cancelonlineorder(orderid) {
    this.temponlineorder = this.onlineorders.filter(x => x.upOrderId == orderid)[0]
    this.modalService.open(this.cancelreason_modal, { centered: true })
  }
  viewonlineorder(orderid) {
    console.log(orderid)
    this.temponlineorder = this.onlineorders.filter(x => x.upOrderId == orderid)[0]
    this.temponlineorder.invoiceno =
      this.temponlineorder.order_details.order.details.channel.charAt(0).toUpperCase() +
      this.temponlineorder.order_details.order.details.ext_platforms[0].id
    this.temponlineorder.order_details.order.items.forEach(item => {
      item.baseprice = item.price
      item.showname = item.title
      item.options_to_add.forEach(option => {
        item.baseprice += option.price
        item.showname += '/' + option.title
      })
    })

    this.modalService.open(this.viewonlineorder_modal, { centered: true, size: 'xl' })
    localStorage.setItem('testonlineorder', JSON.stringify(this.temponlineorder))
  }
  deleteAggOrder(uporderid) {
    console.log(uporderid)
    this.auth.deleteAggOrder(uporderid).subscribe(data => {
      this.getonlineorders()
    })
  }
  printoonlineorder(type) {
    if (type == 'r') {
      var printhtml = document.getElementById('onlineorderreceipt').innerHTML
      printhtml += this.printhtmlstyle
      console.log(printhtml)
      if (this.printersettings)
        this.printservice.print(printhtml, this.printersettings.receiptprinter)
    }
  }
  printonlineorderkot() {
    var kottemplate = `
    <div id="printelement">
      <div class="header">
          <h3>ORDER TICKET #${this.temponlineorder.invoiceno}</h3>
          <table class="item-table">
              <tbody>
                  <tr class="nb">
                      <td class="text-left">${
                        this.temponlineorder.order_details.order.details.channel
                      }</td>
                      <td class="text-right">${this.temponlineorder.invoiceno}</td>
                  </tr>
                  <tr class="nb">
                      <td class="text-left">Time</td>
                      <td class="text-right">${moment(
                        this.temponlineorder.order_details.order.details.created,
                      ).format('LLL')}</td>
                  </tr>
              </tbody>
          </table>
      </div>
      <hr>`
    kottemplate += `
      <div class="text-center">ADDED ITEMS</div>
      <table class="item-table">
          <thead class="nb">
              <th class="text-left">ITEM</th>
              <th class="text-right">QTY</th>
          </thead>
          <tbody>
      `
    this.temponlineorder.order_details.order.items.forEach(ai => {
      kottemplate += `
        <tr class="nb">
            <td class="text-left">${ai.showname}</td>
            <td class="text-right">+${ai.quantity}</td>
        </tr>`
    })
    kottemplate += `
        </tbody>
      </table>
      <hr>
      `
    kottemplate += `
      <div class="text-center">
          <p>Powered By Biz1Book.</p>
      </div>
    </div>
    `
    kottemplate += this.printhtmlstyle
    console.log(kottemplate)
    if (this.printersettings) this.printservice.print(kottemplate, this.printersettings.kotprinter)
  }
  printonlineorderreceipt() {
    var printtemplate = `
    <div id="printelement">
    <div class="header">
        <h3>FB CakeHouse</h3>
        <p>
            ${this.loginfo.Store}, ${this.loginfo.Address}<br>
            ${this.loginfo.City}, ${this.loginfo.ContactNo}
            GSTIN:${this.orderkey.GSTno}<br>
            Receipt: ${this.temponlineorder.invoiceno}<br>
            ${moment(this.temponlineorder.order_details.order.details.created).format('LLL')}
        </p>
    </div>
    <hr>
    <table class="item-table">
        <thead class="nb">
            <th class="text-left" style="width: 100px;">ITEM</th>
            <th>PRICE</th>
            <th>QTY</th>
            <th class="text-right">AMOUNT</th>
        </thead>
        <tbody>`
    this.temponlineorder.order_details.order.items.forEach(item => {
      printtemplate += `
      <tr class="nb">
          <td class="text-left">${item.showname}</td>
          <td class="text-right">${item.baseprice}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${item.total}</td>
      </tr>`
    })
    printtemplate += `
    <tr class="bt">
        <td class="text-left"><strong>Sub Total</strong></td>
        <td colspan="2"></td>
        <td class="text-right">${
          this.temponlineorder.order_details.order.details.order_subtotal
        }</td>
    </tr>
    <tr class="nb" ${
      this.temponlineorder.order_details.order.details.total_external_discount == 0 ? 'hidden' : ''
    }>
        <td class="text-left"><strong>Discount</strong></td>
        <td colspan="2"></td>
        <td class="text-right">${
          this.temponlineorder.order_details.order.details.total_external_discount
        }</td>
    </tr>
    <tr class="nb" ${
      this.temponlineorder.order_details.order.details.total_taxes == 0 ? 'hidden' : ''
    }>
        <td class="text-left"><strong>CGST</strong></td>
        <td colspan="2"></td>
        <td class="text-right">${this.temponlineorder.order_details.order.details.total_taxes /
          2}</td>
    </tr>
    <tr class="nb" ${
      this.temponlineorder.order_details.order.details.total_taxes == 0 ? 'hidden' : ''
    }>
        <td class="text-left"><strong>SGST</strong></td>
        <td colspan="2"></td>
        <td class="text-right">${this.temponlineorder.order_details.order.details.total_taxes /
          2}</td>
    </tr>`
    this.temponlineorder.order_details.order.details.charges.forEach(charge => {
      printtemplate += `
          <tr class="nb">
              <td class="text-left"><strong>${charge.title}</strong></td>
              <td colspan="2"></td>
              <td class="text-right">${charge.value}</td>
          </tr>`
    })
    printtemplate += `
          <tr class="nb">
              <td class="text-left"><strong>Total</strong></td>
              <td colspan="2"></td>
              <td class="text-right">${this.temponlineorder.order_details.order.details.order_total}</td>
          </tr>
        </tbody>
      </table>
      <hr>
      <div class="text-center">
        <p>Powered By Biz1Book.</p>
      </div>
    </div>`
    printtemplate += this.printhtmlstyle
    console.log(printtemplate)
    if (this.printersettings)
      this.printservice.print(printtemplate, this.printersettings.receiptprinter)
  }
}

//////////////////////////////////////GROUP AN OBJECT ARRAY BY A KEY//////////////////////////////////////
// var grouped = _.mapValues(_.groupBy(this.cars, 'make'),
// clist => clist.map(car => _.omit(car, 'make')));
