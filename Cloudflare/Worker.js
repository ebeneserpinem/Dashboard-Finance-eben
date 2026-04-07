export default {
  async fetch(request, env) {

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    /********************************
     POST → SIMPAN TRANSAKSI
    *********************************/
    if (request.method === "POST") {

      try {

        const body = await request.json();

        if (!body.email_id) {
          return new Response(
            JSON.stringify({ error: "email_id wajib" }),
            { headers: corsHeaders }
          );
        }

        await env.DB.prepare(`
          INSERT INTO transaksi
          (tanggal, deskripsi, jumlah, kategori, email_id, no_rekening)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(
          body.tanggal,
          body.deskripsi,
          body.jumlah,
          body.kategori,
          body.email_id,
          body.no_rekening || ""
        )
        .run();

        return new Response(
          JSON.stringify({ status: "saved" }),
          { headers: corsHeaders }
        );

      } catch (e) {

        return new Response(
          JSON.stringify({
            status: "duplicate",
            message: e.message
          }),
          { headers: corsHeaders }
        );

      }

    }

    /********************************
     DATA PIE CHART
    *********************************/
    if (url.pathname === "/api/data") {

      const res = await env.DB.prepare(`
        SELECT kategori, SUM(jumlah) as total
        FROM transaksi
        GROUP BY kategori
      `).all();

      let raw = {
        saldo_net: 0,
        investasi: 0,
        dana_darurat: 0,
        pengeluaran: 0
      };

      res.results.forEach(r => {

        if (raw.hasOwnProperty(r.kategori)) {
          raw[r.kategori] = r.total || 0;
        }

      });

      const sisaNet =
        raw.saldo_net -
        (raw.investasi + raw.dana_darurat + raw.pengeluaran);

      return new Response(
        JSON.stringify({
          saldo_net_display: sisaNet,
          dana_darurat: raw.dana_darurat,
          pengeluaran: raw.pengeluaran,
          investasi: raw.investasi
        }),
        { headers: corsHeaders }
      );

    }

    /********************************
     LIST TRANSAKSI
    *********************************/
    if (url.pathname === "/api/transaksi") {

      const res = await env.DB.prepare(`
        SELECT *
        FROM transaksi
        ORDER BY id DESC
        LIMIT 20
      `).all();

      return new Response(
        JSON.stringify(res.results),
        { headers: corsHeaders }
      );

    }

    /********************************
     RESET DATABASE (OPSIONAL)
    *********************************/
    if (url.pathname === "/api/reset") {

      await env.DB.prepare(`
        DELETE FROM transaksi
      `).run();

      return new Response(
        JSON.stringify({ status: "database cleared" }),
        { headers: corsHeaders }
      );

    }

    return new Response(
      JSON.stringify({ status: "API Active" }),
      { headers: corsHeaders }
    );

  }
};
