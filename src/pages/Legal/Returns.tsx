import { Link } from 'react-router-dom';
import { LegalPage, Section, List } from '../../components/Legal/LegalPage';
import { BUSINESS, POLICIES } from '../../../shared/business';

export const Returns = () => (
    <LegalPage title="Política de Cambios, Devoluciones y Garantía">
        <Section title="1. Plazo">
            <p>
                Puedes solicitar un cambio o una devolución dentro de los <b>{POLICIES.returnDays} días calendario</b> siguientes a la fecha
                en que recoges tu pedido en la agencia de Shalom.
            </p>
        </Section>

        <Section title="2. Cambio o devolución por decisión del cliente">
            <p>Si el producto no cumple tus expectativas o te equivocaste al elegirlo, aceptamos el cambio o la devolución si:</p>
            <List items={[
                'El producto no ha sido usado, instalado ni configurado.',
                'Está en su empaque original, sin daños, con todos sus accesorios, manuales y etiquetas.',
                'Indicas el número de pedido que figura en el correo de tu compra.',
            ]} />
            <p>
                En este caso, el flete de retorno a nuestro local y, si pides un cambio, el flete del nuevo envío corren por cuenta del
                cliente. Se devuelve el precio pagado por el producto.
            </p>
        </Section>

        <Section title="3. Producto defectuoso, dañado en el traslado o distinto al comprado">
            <p>
                Si el producto llega con fallas, dañado o no corresponde a lo que compraste, escríbenos dentro del mismo plazo con fotos
                o un video del producto y del empaque. Tú eliges entre:
            </p>
            <List items={[
                'El cambio por el mismo producto.',
                'El cambio por otro producto de igual o mayor valor (pagando la diferencia, si la hubiera).',
                'La devolución total del dinero pagado.',
            ]} />
            <p>En estos casos, {BUSINESS.tradeName} asume los fletes de retorno y de reenvío.</p>
        </Section>

        <Section title="4. Productos que no admiten devolución por decisión del cliente">
            <List items={[
                'Productos instalados, usados o configurados.',
                'Licencias de software o códigos digitales ya activados.',
                'Productos fabricados, adaptados o pedidos especialmente para ti.',
            ]} />
            <p>Estos productos mantienen su garantía por defectos de fabricación (punto 7).</p>
        </Section>

        <Section title="5. Cómo solicitarlo">
            <List items={[
                <>Escríbenos por WhatsApp al <b>{BUSINESS.phone}</b> o al correo <b>{BUSINESS.email}</b> indicando tu número de pedido, el producto y el motivo.</>,
                'Te indicaremos cómo enviar el producto por Shalom a nuestro local en Huamanga, Ayacucho.',
                'Revisaremos el producto al recibirlo y te informaremos el resultado. Si procede, realizaremos el cambio o la devolución.',
            ]} />
        </Section>

        <Section title="6. Devolución del dinero">
            <p>
                La devolución se hace al mismo medio de pago que usaste: a tu tarjeta mediante Culqi, o a tu cuenta de Yape o Plin. Una
                vez que la procesamos, el tiempo en que el dinero se refleja depende de tu banco o billetera digital. No se devuelve el
                flete del envío original, salvo en los casos del punto 3.
            </p>
        </Section>

        <Section title="7. Garantía">
            <p>
                Los productos cuentan con la <b>garantía del fabricante</b> de cada marca, por el plazo que este establece. La garantía
                cubre defectos de fabricación y {BUSINESS.tradeName} gestiona el trámite con la marca o el proveedor por ti.
            </p>
            <p>La garantía no cubre daños causados por:</p>
            <List items={[
                'Golpes, caídas, humedad, líquidos o fuego.',
                'Sobretensiones o instalaciones eléctricas inadecuadas.',
                'Mal uso, uso distinto al indicado por el fabricante o desgaste normal.',
                'Manipulación, apertura o reparación por terceros no autorizados.',
            ]} />
            <p>Para usar la garantía sigue los pasos del punto 5.</p>
        </Section>

        <Section title="8. Tus derechos">
            <p>
                Esta política no limita los derechos que te reconoce el Código de Protección y Defensa del Consumidor (Ley N° 29571). Si
                no estás conforme con la atención, puedes registrar un reclamo en nuestro{' '}
                <Link to="/libro-de-reclamaciones" className="text-red-600 hover:underline">Libro de Reclamaciones</Link>.
            </p>
        </Section>
    </LegalPage>
);
