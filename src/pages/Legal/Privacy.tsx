import { LegalPage, Section, List } from '../../components/Legal/LegalPage';
import { BUSINESS } from '../../../shared/business';

export const Privacy = () => (
    <LegalPage title="Política de Privacidad">
        <Section title="1. Responsable">
            <p>
                El responsable del tratamiento de tus datos personales es <b>{BUSINESS.legalName}</b>, con RUC {BUSINESS.ruc} y domicilio
                en {BUSINESS.address}. Tratamos tus datos conforme a la Ley N° 29733, Ley de Protección de Datos Personales, y su reglamento.
            </p>
        </Section>

        <Section title="2. Datos que recopilamos">
            <List items={[
                'Datos de tu cuenta: nombre, correo electrónico y contraseña (guardada cifrada; nadie puede verla).',
                'Datos para el envío: DNI, nombres y apellidos según tu DNI, celular y agencia de Shalom de destino.',
                'Historial de tus compras y el estado de tus envíos.',
                'Los datos que registres en el Libro de Reclamaciones.',
            ]} />
            <p>
                Los datos de tu tarjeta los ingresas directamente en el formulario de Culqi; {BUSINESS.tradeName} no los recibe ni los guarda.
            </p>
        </Section>

        <Section title="3. Para qué los usamos">
            <List items={[
                'Gestionar tu cuenta y procesar tus compras y pagos.',
                'Coordinar el envío con Shalom y comunicarnos contigo por WhatsApp o correo sobre tu pedido.',
                'Emitir los comprobantes de pago y cumplir obligaciones legales y tributarias.',
                'Atender cambios, devoluciones, garantías, reclamos y quejas.',
                'Proteger el sitio contra fraudes y accesos automatizados.',
            ]} />
            <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>
        </Section>

        <Section title="4. Con quién los compartimos">
            <p>Solo con los proveedores necesarios para prestarte el servicio:</p>
            <List items={[
                'Culqi: procesamiento de pagos.',
                'Shalom: traslado y entrega de tu pedido (nombre, DNI y celular del destinatario).',
                'apisPeru: verificación de los nombres asociados a tu DNI.',
                'Resend: envío de correos (confirmación de compra, recuperación de contraseña, Libro de Reclamaciones).',
                'Cloudflare y Neon: alojamiento del sitio y de la base de datos, en servidores que pueden estar fuera del Perú.',
            ]} />
        </Section>

        <Section title="5. Cuánto tiempo los conservamos">
            <p>
                Mientras mantengas tu cuenta y, después, por el tiempo que exijan las normas tributarias y de protección al consumidor.
                Las hojas del Libro de Reclamaciones se conservan como mínimo dos años.
            </p>
        </Section>

        <Section title="6. Tus derechos">
            <p>
                Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición escribiendo a <b>{BUSINESS.email}</b> con el
                asunto "Datos personales" y una copia de tu documento de identidad. Si no estás conforme con la respuesta, puedes acudir a
                la Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia y Derechos Humanos.
            </p>
        </Section>

        <Section title="7. Cookies y seguridad">
            <p>
                Usamos únicamente una cookie necesaria para mantener tu sesión iniciada; no usamos cookies publicitarias. La verificación
                anti-robots (Cloudflare Turnstile) analiza información técnica de tu navegador para comprobar que eres una persona. El sitio
                funciona siempre con conexión cifrada (HTTPS).
            </p>
        </Section>

        <Section title="8. Cambios a esta política">
            <p>Si actualizamos esta política, publicaremos la nueva versión en esta página con su fecha de actualización.</p>
        </Section>
    </LegalPage>
);
