import styles from './Whiteboard.module.css'
// Componente que funciona como contenedor

interface WhiteboardProps {
    children: React.ReactNode;
}


export default function Whiteboard({ children }: WhiteboardProps) {
    return (
        <div className={styles.whiteboard}>
            {children}
        </div>
    );
}
