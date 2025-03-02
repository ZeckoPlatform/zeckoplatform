{pkgs}: {
  deps = [
    pkgs.grafana
    pkgs.prometheus-node-exporter
    pkgs.prometheus
    pkgs.postgresql
  ];
}
