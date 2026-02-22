import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
    Font,
} from "@react-pdf/renderer";

// Registering fonts is optional but recommended for custom branding
// For now we will use standard fonts for maximum performance and compatibility

const styles = StyleSheet.create({
    page: {
        padding: 30,
        backgroundColor: "#FFFFFF",
        fontFamily: "Helvetica",
    },
    header: {
        backgroundColor: "#0A0A0A",
        margin: -30,
        marginBottom: 20,
        padding: 20,
        paddingTop: 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    logo: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 10,
    },
    title: {
        color: "#C9A86C", // Gold
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
        letterSpacing: 1,
    },
    subtitle: {
        color: "#969696",
        fontSize: 10,
        textAlign: "center",
        marginTop: 4,
    },
    content: {
        marginTop: 20,
    },
    infoBlock: {
        marginBottom: 20,
        borderBottom: 1,
        borderBottomColor: "#E0E0E0",
        paddingBottom: 10,
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: "bold",
        width: 80,
        color: "#333333",
    },
    value: {
        fontSize: 12,
        color: "#555555",
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#0A0A0A",
        borderLeft: 4,
        borderLeftColor: "#C9A86C",
        paddingLeft: 8,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    imageContainer: {
        width: "48%",
        marginBottom: 10,
        border: 1,
        borderColor: "#EEEEEE",
        borderRadius: 4,
        overflow: "hidden",
    },
    vehicleImage: {
        width: "100%",
        height: 150,
        objectFit: "cover",
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#0A0A0A",
        padding: 10,
        textAlign: "center",
    },
    footerText: {
        color: "#C9A86C",
        fontSize: 10,
        fontWeight: "bold",
    },
    footerSubtext: {
        color: "#969696",
        fontSize: 8,
        marginTop: 2,
    },
});

interface ReportPDFProps {
    data: {
        placa: string;
        clienteNome: string;
        servico: string;
        dataEntrega: string;
        fotos: string[];
        logoUrl?: string;
    };
}

export const ReportPDF = ({ data }: ReportPDFProps) => (
    <Document title={`Relatório - ${data.placa}`}>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                {data.logoUrl && <Image src={data.logoUrl} style={styles.logo} />}
                <Text style={styles.title}>RELATÓRIO DE ENTREGA</Text>
                <Text style={styles.subtitle}>Emitido em: {data.dataEntrega}</Text>
            </View>

            <View style={styles.content}>
                {/* Info Block */}
                <View style={styles.infoBlock}>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Placa:</Text>
                        <Text style={styles.value}>{data.placa.toUpperCase()}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Cliente:</Text>
                        <Text style={styles.value}>{data.clienteNome}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Serviço:</Text>
                        <Text style={styles.value}>{data.servico}</Text>
                    </View>
                </View>

                {/* Photos Section */}
                <Text style={styles.sectionTitle}>Fotos do Veículo</Text>
                <View style={styles.grid}>
                    {data.fotos.map((foto, index) => (
                        <View key={index} style={styles.imageContainer}>
                            <Image src={foto} style={styles.vehicleImage} />
                        </View>
                    ))}
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer} fixed>
                <Text style={styles.footerText}>Glow Car Detailing</Text>
                <Text style={styles.footerSubtext}>Seu veículo merece brilhar</Text>
            </View>
        </Page>
    </Document>
);
