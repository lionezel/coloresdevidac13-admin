const fs = require('fs');

const path = '/Users/developeropitech1/Desktop/Coloresdevidac13-admin/src/pages/CashClosingPage.tsx';
let code = fs.readFileSync(path, 'utf8');

// Chunk 1
const c1Target = `    const [openingBalance, setOpeningBalance] = useState<number>(0);
    const [actualTransfer, setActualTransfer] = useState<number>(0);
    const [actualCard, setActualCard] = useState<number>(0);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [selectedClosing, setSelectedClosing] = useState<CashClosing | null>(null);
    const [dialogTab, setDialogTab] = useState(0);
    const [targetDateStr, setTargetDateStr] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return \`\${year}-\${month}-\${day}\`;
    });

    // --- NUEVOS ESTADOS PARA DESGLOSE ---
    const [denominations, setDenominations] = useState({
        coins50: 0, coins100: 0, coins200: 0, coins500: 0, coins1000: 0,
        bills2000: 0, bills5000: 0, bills10000: 0, bills20000: 0, bills50000: 0, bills100000: 0
    });
    const [newExpense, setNewExpense] = useState({ description: "", amount: 0 });
    const [newIncome, setNewIncome] = useState({ description: "", amount: 0 });`;

const c1Replace = `    const [openingBalance, setOpeningBalance] = useState<number>(() => {
        const saved = localStorage.getItem(\`closing_openBal_\${restaurantId}\`);
        return saved !== null ? Number(saved) : 0;
    });
    const [openingBalanceDesc, setOpeningBalanceDesc] = useState<string>(() => {
        return localStorage.getItem(\`closing_openBalDesc_\${restaurantId}\`) || "";
    });
    const [actualTransferStr, setActualTransferStr] = useState<string>(() => {
        return localStorage.getItem(\`closing_actualTransfer_\${restaurantId}\`) || "";
    });
    const [actualCardStr, setActualCardStr] = useState<string>(() => {
        return localStorage.getItem(\`closing_actualCard_\${restaurantId}\`) || "";
    });
    const [notes, setNotes] = useState(() => {
        return localStorage.getItem(\`closing_notes_\${restaurantId}\`) || "";
    });
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [selectedClosing, setSelectedClosing] = useState<CashClosing | null>(null);
    const [dialogTab, setDialogTab] = useState(0);
    const [targetDateStr, setTargetDateStr] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return \`\${year}-\${month}-\${day}\`;
    });

    // --- NUEVOS ESTADOS PARA DESGLOSE ---
    const [denominations, setDenominations] = useState(() => {
        const saved = localStorage.getItem(\`closing_denoms_\${restaurantId}\`);
        if(saved) { try { return JSON.parse(saved); } catch(e){} }
        return {
            coins50: 0, coins100: 0, coins200: 0, coins500: 0, coins1000: 0,
            bills2000: 0, bills5000: 0, bills10000: 0, bills20000: 0, bills50000: 0, bills100000: 0
        };
    });
    const [newExpense, setNewExpense] = useState({ description: "", amount: 0 });
    const [newIncome, setNewIncome] = useState({ description: "", amount: 0 });

    const evaluateMath = (str) => {
        if (!str) return 0;
        try {
            const sanitized = str.replace(/[^\\d+\\.\\-]/g, '');
            let total = 0;
            const terms = sanitized.replace(/\\-/g, '+-').split('+');
            for(const t of terms) {
                total += Number(t) || 0;
            }
            return total;
        } catch { return 0; }
    };

    const actualTransfer = useMemo(() => evaluateMath(actualTransferStr), [actualTransferStr]);
    const actualCard = useMemo(() => evaluateMath(actualCardStr), [actualCardStr]);

    React.useEffect(() => {
        if (!restaurantId) return;
        localStorage.setItem(\`closing_openBal_\${restaurantId}\`, String(openingBalance));
        localStorage.setItem(\`closing_openBalDesc_\${restaurantId}\`, openingBalanceDesc);
        localStorage.setItem(\`closing_actualTransfer_\${restaurantId}\`, actualTransferStr);
        localStorage.setItem(\`closing_actualCard_\${restaurantId}\`, actualCardStr);
        localStorage.setItem(\`closing_notes_\${restaurantId}\`, notes);
        localStorage.setItem(\`closing_denoms_\${restaurantId}\`, JSON.stringify(denominations));
    }, [openingBalance, openingBalanceDesc, actualTransferStr, actualCardStr, notes, denominations, restaurantId]);

    React.useEffect(() => {
        if (closings.length > 0 && restaurantId) {
            const hasSaved = localStorage.getItem(\`closing_openBal_\${restaurantId}\`);
            if (hasSaved === null) {
                const sorted = [...closings].sort((a, b) => {
                    const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date || 0);
                    const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date || 0);
                    return dB.getTime() - dA.getTime();
                });
                if (sorted.length > 0) {
                    setOpeningBalance(sorted[0].actualCash || 0);
                    localStorage.setItem(\`closing_openBal_\${restaurantId}\`, String(sorted[0].actualCash || 0));
                }
            }
        }
    }, [closings, restaurantId]);`;

code = code.replace(c1Target, c1Replace);

const c2Target = `                openingBalance: Number(openingBalance),
                actualCash: Number(actualCash),`;
const c2Replace = `                openingBalance: Number(openingBalance),
                openingBalanceDesc,
                actualCash: Number(actualCash),`;
code = code.replace(c2Target, c2Replace);

const c3Target = `            setOpeningBalance(0);
            setActualTransfer(0);
            setActualCard(0);
            setDenominations({
                coins50: 0, coins100: 0, coins200: 0, coins500: 0, coins1000: 0,
                bills2000: 0, bills5000: 0, bills10000: 0, bills20000: 0, bills50000: 0, bills100000: 0
            });
            setNotes("");`;
const c3Replace = `            setOpeningBalance(0);
            setOpeningBalanceDesc("");
            setActualTransferStr("");
            setActualCardStr("");
            setDenominations({
                coins50: 0, coins100: 0, coins200: 0, coins500: 0, coins1000: 0,
                bills2000: 0, bills5000: 0, bills10000: 0, bills20000: 0, bills50000: 0, bills100000: 0
            });
            setNotes("");
            if (restaurantId) {
                localStorage.removeItem(\`closing_openBal_\${restaurantId}\`);
                localStorage.removeItem(\`closing_openBalDesc_\${restaurantId}\`);
                localStorage.removeItem(\`closing_actualTransfer_\${restaurantId}\`);
                localStorage.removeItem(\`closing_actualCard_\${restaurantId}\`);
                localStorage.removeItem(\`closing_notes_\${restaurantId}\`);
                localStorage.removeItem(\`closing_denoms_\${restaurantId}\`);
            }`;
code = code.replace(c3Target, c3Replace);

const c4Target = `                                <TextField
                                    label="Base de Efectivo (Apertura)"
                                    type="number"
                                    fullWidth
                                    variant="outlined"
                                    value={openingBalance || ""}
                                    onChange={(e) => setOpeningBalance(Number(e.target.value))}
                                    InputProps={{
                                        startAdornment: <AttachMoney sx={{ color: "text.disabled", mr: 1 }} />,
                                    }}
                                    helperText="Dinero con el que inició el turno."
                                />

                                <Grid container spacing={2} alignItems="center">
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Efectivo Sistema (Teórico):</Typography>
                                        <Typography variant="body1" fontWeight={800}>{formatCOP(expectedCash)}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Efectivo Real (Desglose):</Typography>
                                        <Typography variant="body1" fontWeight={900} color="primary.main">{formatCOP(actualCash)}</Typography>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 1 }} />

                                <Grid container spacing={2} alignItems="center">
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Tarjeta Sistema:</Typography>
                                        <Typography variant="body1" fontWeight={800}>{formatCOP(summary.tarjeta)}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            label="Tarjeta Real"
                                            type="number"
                                            fullWidth
                                            size="small"
                                            variant="outlined"
                                            value={actualCard || ""}
                                            onChange={(e) => setActualCard(Number(e.target.value))}
                                            InputProps={{
                                                startAdornment: <CreditCard sx={{ fontSize: 18, color: "text.disabled", mr: 1 }} />,
                                            }}
                                        />
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 1 }} />

                                <Grid container spacing={2} alignItems="center">
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Transferencia Sistema:</Typography>
                                        <Typography variant="body1" fontWeight={800}>{formatCOP(summary.transferencia)}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            label="Transferencia Real"
                                            type="number"
                                            fullWidth
                                            size="small"
                                            variant="outlined"
                                            value={actualTransfer || ""}
                                            onChange={(e) => setActualTransfer(Number(e.target.value))}
                                            InputProps={{
                                                startAdornment: <AccountBalance sx={{ fontSize: 18, color: "text.disabled", mr: 1 }} />,
                                            }}
                                        />
                                    </Grid>
                                </Grid>`;

const c4Replace = `                                <TextField
                                    label="Base de Efectivo (Apertura)"
                                    type="number"
                                    fullWidth
                                    variant="outlined"
                                    value={openingBalance || ""}
                                    onChange={(e) => setOpeningBalance(Number(e.target.value))}
                                    InputProps={{
                                        startAdornment: <AttachMoney sx={{ color: "text.disabled", mr: 1 }} />,
                                    }}
                                    helperText="Dinero con el que inició el turno."
                                />

                                <TextField
                                    label="¿Por qué se modificó la base?"
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                    value={openingBalanceDesc || ""}
                                    onChange={(e) => setOpeningBalanceDesc(e.target.value)}
                                    helperText="Opcional. Explique si la base difiere de lo esperado."
                                    sx={{ mt: 2 }}
                                />

                                <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Efectivo Sistema (Teórico):</Typography>
                                        <Typography variant="body1" fontWeight={800}>{formatCOP(expectedCash)}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Efectivo Real (Desglose):</Typography>
                                        <Typography variant="body1" fontWeight={900} color="primary.main">{formatCOP(actualCash)}</Typography>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 1 }} />

                                <Grid container spacing={2} alignItems="center">
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Tarjeta Sistema:</Typography>
                                        <Typography variant="body1" fontWeight={800}>{formatCOP(summary.tarjeta)}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            label="Tarjeta Real (Suma ej: 20000+10000)"
                                            type="text"
                                            fullWidth
                                            size="small"
                                            variant="outlined"
                                            value={actualCardStr || ""}
                                            onChange={(e) => setActualCardStr(e.target.value)}
                                            InputProps={{
                                                startAdornment: <CreditCard sx={{ fontSize: 18, color: "text.disabled", mr: 1 }} />,
                                            }}
                                            helperText={actualCardStr && actualCard !== 0 ? \`Total: \${formatCOP(actualCard)}\` : ""}
                                        />
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 1 }} />

                                <Grid container spacing={2} alignItems="center">
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Transferencia Sistema:</Typography>
                                        <Typography variant="body1" fontWeight={800}>{formatCOP(summary.transferencia)}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            label="Transferencia Real (Suma ej: 20000+10000)"
                                            type="text"
                                            fullWidth
                                            size="small"
                                            variant="outlined"
                                            value={actualTransferStr || ""}
                                            onChange={(e) => setActualTransferStr(e.target.value)}
                                            InputProps={{
                                                startAdornment: <AccountBalance sx={{ fontSize: 18, color: "text.disabled", mr: 1 }} />,
                                            }}
                                            helperText={actualTransferStr && actualTransfer !== 0 ? \`Total: \${formatCOP(actualTransfer)}\` : ""}
                                        />
                                    </Grid>
                                </Grid>`;
code = code.replace(c4Target, c4Replace);

fs.writeFileSync(path, code);
console.log('Update successful!');
