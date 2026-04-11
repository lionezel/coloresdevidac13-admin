import React from 'react';
import { Order } from '../interfaces/Order';

interface InvoiceReceiptProps {
    order: Order;
}

export const InvoiceReceipt = React.forwardRef<HTMLDivElement, InvoiceReceiptProps>(({ order }, ref) => {
    const priceToString = (num: number) => num.toLocaleString('es-CO');

    const formatDate = (dateValue: any) => {
        let date = new Date();
        if (dateValue) {
            if (dateValue.toDate) date = dateValue.toDate();
            else if (dateValue instanceof Date) date = dateValue;
            else date = new Date(dateValue);
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        const strTime = String(hours).padStart(2, '0') + ':' + minutes + ':' + seconds + ' ' + ampm;
        
        return `${day}/${month}/${year} ${strTime}`;
    };

    const totalItems = order.products.reduce((acc, p) => acc + p.quantity, 0);
    const subtotal = order.subTotal || (order.total + (order.discountAmount || 0) - (order.tipAmount || 0));

    return (
        <div ref={ref} className="bg-white text-black font-mono leading-tight" style={{ fontFamily: '"Courier New", Courier, monospace', width: '300px', margin: '0 auto', fontSize: '12px', padding: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px', textAlign: 'center' }}>
                <img src="/logoc.jpeg" alt="Colores de Vida" style={{ width: '180px', height: 'auto', marginBottom: '8px', filter: 'grayscale(100%) brightness(0.8) contrast(1.2)' }} />
                <p style={{ margin: 0 }}>COLORES DE VIDA</p>
                <p style={{ margin: 0 }}>2DO TRAMO ESCALERAS ELECTRICAS</p>
                <p style={{ margin: 0 }}>COMUNA 13 - MEDELLIN</p>
                <p style={{ margin: 0 }}>TELEFONO: 310 743 3397</p>
                <p style={{ margin: 0 }}>NIT: 1152185281-1</p>
                <p style={{ margin: 0 }}>GRACIAS POR VISITARNOS</p>
                <p style={{ margin: 0 }}>**** CUENTA POR PAGAR ****</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: '100px' }}>Recibo:</span>
                    <span>{order.id ? order.id.slice(-6).toUpperCase() : "JS011850"}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: '100px' }}>Fecha:</span>
                    <span>{formatDate(order.dateSuccess || order.date)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: '100px' }}>Equipo:</span>
                    <span>DESKTOP-4DFJV64</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: '100px' }}>Atendido X:</span>
                    <span>ADMIN</span>
                </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', borderBottom: '1px dashed black', paddingBottom: '4px', marginBottom: '4px' }}>
                    <span style={{ flex: 1 }}>Producto</span>
                    <span style={{ width: '50px', textAlign: 'right' }}>Precio</span>
                    <span style={{ width: '40px', textAlign: 'right' }}>Cant</span>
                    <span style={{ width: '60px', textAlign: 'right' }}>Valor</span>
                </div>
                {order.products.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '4px', lineHeight: '1.2' }}>
                        <span style={{ flex: 1, textTransform: 'uppercase', paddingRight: '4px', wordBreak: 'break-word' }}>
                            {p.productName}
                            {p.variantLabel && <div style={{ fontSize: '0.85em', textTransform: 'none' }}>- {p.variantLabel}</div>}
                            {p.additions?.map((add, aIdx) => (
                                <div key={aIdx} style={{ fontSize: '0.85em', textTransform: 'none' }}>+ {add.name} ({priceToString(add.price)})</div>
                            ))}
                        </span>
                        <span style={{ width: '50px', textAlign: 'right' }}>{priceToString(p.price)}</span>
                        <span style={{ width: '40px', textAlign: 'right' }}>x{p.quantity}</span>
                        <span style={{ width: '60px', textAlign: 'right' }}>{priceToString(p.total ?? (p.price * p.quantity))}</span>
                    </div>
                ))}
                <div style={{ borderTop: '1px dashed black', marginTop: '4px' }}></div>
            </div>

            <div style={{ textTransform: 'uppercase', marginBottom: '16px', marginTop: '8px' }}>
                <p style={{ margin: 0 }}>PRODUCTOS A PAGAR EN CAJA:{totalItems}</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold' }}>Subtotal:</span>
                    <span>{priceToString(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Impuesto:</span>
                    <span>000</span>
                </div>
                
                {order.discountAmount ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Descuento:</span>
                        <span>-{priceToString(order.discountAmount)}</span>
                    </div>
                ) : null}

                {order.tipAmount ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Propina:</span>
                        <span>+{priceToString(order.tipAmount)}</span>
                    </div>
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '14px' }}>
                    <span style={{ fontWeight: 'bold' }}>TOTAL:</span>
                    <span style={{ fontWeight: 'bold' }}>{priceToString(order.total)}</span>
                </div>
                
                <p style={{ marginTop: '4px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', marginBottom: '16px' }}>
                    {order.paymentMethod?.toLowerCase() === 'efectivo' ? "VENTA EN EFECTIVO" : "VENTA CON TARJETA"}
                </p>

                {order.paymentMethod?.toLowerCase() !== 'efectivo' && (
                    <p style={{ textAlign: 'center', marginBottom: '16px', margin: 0 }}>
                        A card payment was received
                    </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                    <span>MONTO</span>
                    <span>{priceToString(order.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '4px', fontSize: '13px' }}>
                    <span>Total</span>
                    <span>{priceToString(order.total)}</span>
                </div>
            </div>
        </div>
    );
});

InvoiceReceipt.displayName = 'InvoiceReceipt';
