import { Link } from 'react-router-dom';
import { LegalPage, Section, List } from '../../components/Legal/LegalPage';
import { BUSINESS, POLICIES } from '../../../shared/business';

export const Terms = () => (
    <LegalPage title="Términos y Condiciones">
        <Section title="1. Identificación del proveedor">
            <p>
                Este sitio web ({BUSINESS.website}) es operado por <b>{BUSINESS.legalName}</b>, con RUC <b>{BUSINESS.ruc}</b> y
                domicilio en {BUSINESS.address}. Puedes contactarnos al correo <b>{BUSINESS.email}</b> o al teléfono y WhatsApp <b>{BUSINESS.phone}</b>.
            </p>
        </Section>

        <Section title="2. Aceptación">
            <p>
                Al registrarte o realizar una compra aceptas estos Términos y Condiciones, la{' '}
                <Link to="/cambios-y-devoluciones" className="text-red-600 hover:underline">Política de Cambios, Devoluciones y Garantía</Link> y la{' '}
                <Link to="/privacidad" className="text-red-600 hover:underline">Política de Privacidad</Link>. Para comprar debes ser mayor de
                edad o contar con la autorización de tu padre, madre o tutor.
            </p>
        </Section>

        <Section title="3. Cuenta de usuario">
            <p>
                Para comprar necesitas una cuenta registrada con tu correo electrónico. Eres responsable de mantener la confidencialidad
                de tu contraseña y de que los datos que registras sean verdaderos. Podemos suspender cuentas usadas de forma fraudulenta.
            </p>
        </Section>

        <Section title="4. Productos, precios y stock">
            <List items={[
                'Los precios se muestran en soles (S/) e incluyen el IGV. No incluyen el flete de envío, que se paga en la agencia de destino (ver punto 7).',
                'Las imágenes son referenciales; las características de cada producto se indican en su descripción.',
                'Las compras están sujetas a la disponibilidad de stock. Si después de tu pago un producto no estuviera disponible, te contactaremos para ofrecerte otro producto o la devolución total de tu dinero.',
                'Si un precio publicado tuviera un error evidente, te contactaremos antes del despacho para que decidas si continúas con la compra o recibes la devolución total.',
            ]} />
        </Section>

        <Section title="5. Proceso de compra y medios de pago">
            <p>
                Para comprar inicias sesión, agregas productos al carrito, ingresas el DNI y el celular del destinatario y eliges la
                agencia de Shalom de destino. Los pagos se procesan de forma segura a través de <b>Culqi</b> con:
            </p>
            <List items={[
                'Tarjetas de crédito o débito Visa, Mastercard, American Express y Diners Club. Tu banco puede pedirte una verificación adicional (3D Secure).',
                'Yape, con el código de aprobación de tu aplicación.',
                'Yape o Plin, escaneando un código QR (para compras entre S/ 6 y S/ 500; el QR vence a los 20 minutos).',
            ]} />
            <p>
                {BUSINESS.tradeName} no almacena los datos de tu tarjeta. La compra queda confirmada cuando Culqi aprueba el pago; en ese
                momento te enviamos un correo con el detalle de tu pedido.
            </p>
        </Section>

        <Section title="6. Comprobante de pago">
            <p>
                Emitimos el comprobante de pago electrónico que corresponde (boleta de venta o factura). Si necesitas factura,
                comunícate con nosotros antes del despacho indicando tu RUC y razón social.
            </p>
        </Section>

        <Section title="7. Envío por Shalom">
            <List items={[
                'Realizamos envíos a todo el Perú a través de Shalom, a la agencia que elijas al comprar.',
                'El flete lo paga el cliente al recoger el pedido en la agencia de destino, según las tarifas vigentes de Shalom.',
                'Cuando despachemos tu pedido te enviaremos por WhatsApp el número de orden o guía de Shalom.',
                'El pedido solo puede recogerlo el destinatario registrado, presentando su DNI. Los tiempos de traslado dependen de Shalom y del destino.',
                'Te recomendamos revisar el paquete al recogerlo. Si llega dañado o incompleto, avísanos según la Política de Cambios, Devoluciones y Garantía.',
            ]} />
        </Section>

        <Section title="8. Cancelaciones">
            <p>
                Puedes cancelar tu pedido mientras no haya sido despachado escribiéndonos por WhatsApp o correo; te devolveremos el
                total pagado al mismo medio de pago.
            </p>
        </Section>

        <Section title="9. Cambios, devoluciones y garantía">
            <p>
                Tienes {POLICIES.returnDays} días calendario desde que recoges tu pedido para solicitar un cambio o devolución. Los productos
                cuentan con la garantía del fabricante. El detalle está en la{' '}
                <Link to="/cambios-y-devoluciones" className="text-red-600 hover:underline">Política de Cambios, Devoluciones y Garantía</Link>.
            </p>
        </Section>

        <Section title="10. Libro de Reclamaciones">
            <p>
                Conforme al Código de Protección y Defensa del Consumidor (Ley N° 29571), ponemos a tu disposición nuestro{' '}
                <Link to="/libro-de-reclamaciones" className="text-red-600 hover:underline">Libro de Reclamaciones virtual</Link>. Responderemos
                tu reclamo o queja en un plazo no mayor a {POLICIES.complaintResponseDays} días hábiles.
            </p>
        </Section>

        <Section title="11. Datos personales">
            <p>
                Tratamos tus datos conforme a la Ley N° 29733, Ley de Protección de Datos Personales, como se explica en nuestra{' '}
                <Link to="/privacidad" className="text-red-600 hover:underline">Política de Privacidad</Link>.
            </p>
        </Section>

        <Section title="12. Propiedad intelectual">
            <p>
                Los textos, logotipos y diseño de este sitio pertenecen a {BUSINESS.legalName} o a sus respectivos titulares. Las marcas
                de los productos pertenecen a sus fabricantes.
            </p>
        </Section>

        <Section title="13. Responsabilidad">
            <p>
                No somos responsables por daños derivados del uso inadecuado de los productos o de instalaciones realizadas por
                terceros. Hacemos lo posible para que el sitio esté disponible y libre de errores, pero puede haber interrupciones por
                mantenimiento o causas ajenas a nosotros.
            </p>
        </Section>

        <Section title="14. Modificaciones y legislación aplicable">
            <p>
                Podemos actualizar estos términos; la versión vigente es la publicada en esta página y se aplica a las compras
                realizadas desde su publicación. Estos términos se rigen por las leyes de la República del Perú. Nada de lo aquí
                indicado limita los derechos que te reconoce el Código de Protección y Defensa del Consumidor.
            </p>
        </Section>
    </LegalPage>
);
